import { afterAll, describe, expect, it } from "vitest";
import { createAccount } from "@/modules/accounts/application/manage-accounts";
import { createCard } from "@/modules/accounts/application/manage-cards";
import {
  authenticateIngestToken,
  ingestNotice,
  listPendingNotices,
  listReviewedNotices,
} from "@/modules/inbox";
import { createIngestToken, revokeIngestToken } from "@/modules/inbox/application/ingest-tokens";
import {
  recordNoticeAsExpense,
  recordNoticeAsTransfer,
} from "@/modules/inbox/application/review-notices";
import { getAccountBalances } from "@/modules/transactions";
import { prisma } from "@/shared/infrastructure";
import { TODAY, categoryId, createUser, unwrap } from "./helpers";

afterAll(() => prisma.$disconnect());

const TZ = "America/Santiago";
const person = (id: string) => ({ id, name: "Persona de prueba", timezone: TZ });

async function bankAccount(userId: string, institution: string, name: string) {
  return unwrap(
    await createAccount(userId, {
      type: "CHECKING",
      currency: "CLP",
      name,
      institution,
      openingBalance: "500000",
    }),
  );
}

const day = TODAY.split("-").reverse().join("/");

/** Ingests a notice that must be stored (anything but IGNORED). */
async function ingest(userId: string, input: Parameters<typeof ingestNotice>[1]) {
  const result = await ingestNotice(userId, input);
  if (result.notice === null) throw new Error("The notice was ignored");
  return result;
}

describe("bank notices inbox", () => {
  it("keeps one notice when a purchase arrives by email and by SMS, and ignores resends", async () => {
    const userId = await createUser();
    const email = await ingest(userId, {
      channel: "EMAIL",
      sender: "enviodigital@bancochile.cl",
      text: `Se ha realizado una compra por $12.345 con Tarjeta de Crédito ****1234 en LIDER EXPRESS 123 el ${day} 12:34.`,
    });
    const sms = await ingest(userId, {
      channel: "SMS",
      text: `Banco de Chile: Compra $12.345 tarjeta ****1234 en Lider Express ${day} 12:35`,
    });
    const resent = await ingest(userId, {
      channel: "SMS",
      text: `Banco de Chile: Compra $12.345 tarjeta ****1234 en Lider Express ${day} 12:35`,
    });

    expect(email.outcome).toBe("CREATED");
    expect(sms.outcome).toBe("DUPLICATE");
    expect(sms.notice.duplicateOfId).toBe(email.notice.id);
    expect(resent.outcome).toBe("RESENT");

    const pending = await listPendingNotices(person(userId));
    expect(pending).toHaveLength(1);
    expect(pending[0]?.copies).toEqual(["SMS"]);
  });

  it("records a notice as an expense and suggests the same next time", async () => {
    const userId = await createUser();
    const checking = await bankAccount(userId, "Santander", "Cuenta Santander");
    const groceries = await categoryId(userId, "Supermercado");
    const first = await ingest(userId, {
      channel: "SMS",
      sender: "Santander",
      text: `Santander: Compra por $8.990 con tarjeta de debito en JUMBO LA REINA ${day} 10:00`,
    });

    const [item] = await listPendingNotices(person(userId));
    expect(item?.suggestion).toMatchObject({ kind: "EXPENSE", accountId: checking.id });

    unwrap(
      await recordNoticeAsExpense(userId, first.notice.id, {
        accountId: checking.id,
        categoryId: groceries,
        amount: "8990",
        date: TODAY,
        description: "JUMBO LA REINA",
      }),
    );
    const balances = await getAccountBalances(userId, TODAY);
    expect(balances.get(checking.id)?.posted).toBe(500000 - 8990);
    expect((await listReviewedNotices(userId))[0]?.status).toBe("RECORDED");

    // Recording it again is refused: the notice was already reviewed.
    const again = await recordNoticeAsExpense(userId, first.notice.id, {
      accountId: checking.id,
      categoryId: groceries,
      amount: "8990",
      date: TODAY,
      description: "JUMBO LA REINA",
    });
    expect(again.ok).toBe(false);

    await ingest(userId, {
      channel: "SMS",
      sender: "Santander",
      text: `Santander: Compra por $15.200 con tarjeta de debito en JUMBO LA REINA ${day} 19:00`,
    });
    const [next] = await listPendingNotices(person(userId));
    expect(next?.suggestion).toMatchObject({
      kind: "EXPENSE",
      learned: true,
      categoryId: groceries,
      accountId: checking.id,
    });
  });

  it("recognizes a transfer between own accounts and records both notices once", async () => {
    const userId = await createUser();
    const santander = await bankAccount(userId, "Santander", "Corriente Santander");
    const bci = await bankAccount(userId, "Bci", "Corriente Bci");

    const sent = await ingest(userId, {
      channel: "EMAIL",
      sender: "transferencias@santander.cl",
      text: `Transferiste $100.000 a Persona De Prueba, cuenta corriente en Bci, el ${day}.`,
    });
    const received = await ingest(userId, {
      channel: "SMS",
      sender: "Bci",
      text: `Bci: Recibiste una transferencia de $100.000 de Persona De Prueba el ${day}`,
    });

    const pending = await listPendingNotices(person(userId));
    const outgoing = pending.find((n) => n.id === sent.notice.id);
    expect(outgoing?.suggestion).toMatchObject({
      kind: "TRANSFER",
      transferReason: "OWN_NAME",
      fromAccountId: santander.id,
      toAccountId: bci.id,
      pairedNoticeId: received.notice.id,
    });

    const result = unwrap(
      await recordNoticeAsTransfer(
        userId,
        sent.notice.id,
        { fromAccountId: santander.id, toAccountId: bci.id, amount: "100000", date: TODAY },
        received.notice.id,
        TZ,
      ),
    );
    expect(result.recorded).toBe(2);
    expect(await listPendingNotices(person(userId))).toHaveLength(0);
    const balances = await getAccountBalances(userId, TODAY);
    expect(balances.get(santander.id)?.posted).toBe(400000);
    expect(balances.get(bci.id)?.posted).toBe(600000);
  });

  it("closes a late notice of a transfer already recorded from its other leg", async () => {
    const userId = await createUser();
    const santander = await bankAccount(userId, "Santander", "Corriente Santander");
    const bci = await bankAccount(userId, "Bci", "Corriente Bci");
    const sent = await ingest(userId, {
      channel: "EMAIL",
      sender: "transferencias@santander.cl",
      text: `Transferiste $50.000 a Persona De Prueba el ${day}.`,
    });
    unwrap(
      await recordNoticeAsTransfer(
        userId,
        sent.notice.id,
        { fromAccountId: santander.id, toAccountId: bci.id, amount: "50000", date: TODAY },
        null,
        TZ,
      ),
    );

    const late = await ingest(userId, {
      channel: "SMS",
      sender: "Bci",
      text: `Bci: Recibiste $50.000 de Persona De Prueba`,
    });
    expect(late.outcome).toBe("ALREADY_RECORDED");
    expect(await listPendingNotices(person(userId))).toHaveLength(0);
  });

  it("authenticates Shortcuts by token and isolates users", async () => {
    const alice = await createUser();
    const bob = await createUser();
    const { token, summary } = await createIngestToken(alice, "iPhone");

    expect(await authenticateIngestToken(token)).toBe(alice);
    expect(await authenticateIngestToken("lucapp_wrong")).toBeNull();
    expect(await authenticateIngestToken(null)).toBeNull();

    const notice = await ingest(alice, {
      channel: "SMS",
      text: "Compra por $1.000 en KIOSCO",
    });
    const checking = await bankAccount(bob, "Bci", "Bob");
    const stolen = await recordNoticeAsExpense(bob, notice.notice.id, {
      accountId: checking.id,
      categoryId: await categoryId(bob, "Supermercado"),
      amount: "1000",
      date: TODAY,
      description: "KIOSCO",
    });
    expect(stolen.ok).toBe(false);
    expect((await revokeIngestToken(bob, summary.id)).ok).toBe(false);
    expect((await revokeIngestToken(alice, summary.id)).ok).toBe(true);
    expect(await authenticateIngestToken(token)).toBeNull();
  });
  it("ignores notifications that are not movements, but keeps what is pasted by hand", async () => {
    const userId = await createUser();
    const offer = {
      channel: "PUSH" as const,
      sender: "Santander",
      text: "Aprovecha 40% dcto en tu compra sobre $20.000 en Jumbo",
    };
    expect((await ingestNotice(userId, offer)).outcome).toBe("IGNORED");
    expect(
      (
        await ingestNotice(userId, {
          channel: "PUSH",
          text: "Iniciaste sesión en un nuevo dispositivo",
        })
      ).outcome,
    ).toBe("IGNORED");
    expect(await listPendingNotices(person(userId))).toHaveLength(0);

    expect((await ingestNotice(userId, offer, { keepAll: true })).outcome).toBe("CREATED");
    expect(await listPendingNotices(person(userId))).toHaveLength(1);
  });

  it("merges a bank notification with its Apple Pay payment and completes what was missing", async () => {
    const userId = await createUser();
    const push = await ingest(userId, {
      channel: "PUSH",
      sender: "Banco de Chile",
      text: "Compra aprobada\nCompraste $12.990 con tu tarjeta de crédito ****4321",
    });
    const wallet = await ingestNotice(userId, {
      channel: "WALLET",
      amount: "$12.990",
      merchant: "JUMBO LA REINA",
      card: "Visa Signature",
    });
    expect(push.outcome).toBe("CREATED");
    expect(push.notice.merchant).toBeNull();
    expect(wallet.outcome).toBe("DUPLICATE");

    const pending = await listPendingNotices(person(userId));
    expect(pending).toHaveLength(1);
    expect(pending[0]).toMatchObject({
      channel: "PUSH",
      copies: ["WALLET"],
      merchant: "JUMBO LA REINA",
      last4: "4321",
      institution: "Banco de Chile",
      walletCard: "Visa Signature",
    });
  });

  it("keeps two equal Apple Pay payments, and drops an immediate retry", async () => {
    const userId = await createUser();
    const trip = { channel: "WALLET" as const, amount: "870", merchant: "Metro de Santiago" };
    const morning = new Date(Date.now() - 3 * 3_600_000);
    expect((await ingestNotice(userId, { ...trip, receivedAt: morning })).outcome).toBe("CREATED");
    expect((await ingestNotice(userId, trip)).outcome).toBe("CREATED");
    expect((await ingestNotice(userId, trip)).outcome).toBe("RESENT");
    expect((await ingestNotice(userId, { channel: "WALLET", merchant: "Sin monto" })).outcome).toBe(
      "IGNORED",
    );
    expect(await listPendingNotices(person(userId))).toHaveLength(2);
  });

  it("suggests the account of an Apple Pay card by its name, then by what was chosen", async () => {
    const userId = await createUser();
    const credit = unwrap(
      await createAccount(userId, {
        type: "CREDIT_CARD",
        currency: "CLP",
        name: "Tarjeta Chile",
        institution: "Banco de Chile",
        creditLimit: "1000000",
      }),
    );
    const card = unwrap(
      await createCard(userId, { accountId: credit.id, name: "Visa Signature", network: "VISA" }),
    );
    const other = await bankAccount(userId, "Santander", "Cuenta Santander");
    const groceries = await categoryId(userId, "Supermercado");

    // The Wallet name contains the card's name in LucApp.
    await ingest(userId, {
      channel: "WALLET",
      amount: "$5.000",
      merchant: "COPEC",
      card: "Visa Signature Banco de Chile",
    });
    const [byName] = await listPendingNotices(person(userId));
    expect(byName?.suggestion).toMatchObject({ accountId: credit.id, cardId: card.id });

    // A card LucApp cannot place: the choice is remembered for that Wallet card.
    const first = await ingest(userId, {
      channel: "WALLET",
      amount: "$3.500",
      merchant: "PANADERIA LO SAAVEDRA",
      card: "Débito Black",
    });
    unwrap(
      await recordNoticeAsExpense(userId, first.notice.id, {
        accountId: other.id,
        categoryId: groceries,
        amount: "3500",
        date: TODAY,
        description: "PANADERIA LO SAAVEDRA",
      }),
    );
    await ingest(userId, {
      channel: "WALLET",
      amount: "$9.990",
      merchant: "FARMACIA CRUZ VERDE",
      card: "Débito Black",
    });
    const learned = (await listPendingNotices(person(userId))).find(
      (n) => n.merchant === "FARMACIA CRUZ VERDE",
    );
    expect(learned?.suggestion).toMatchObject({ kind: "EXPENSE", accountId: other.id });
  });
});
