import { afterAll, describe, expect, it } from "vitest";
import { getReimbursementTotals, listReimbursements } from "@/modules/reimbursements";
import {
  approveReimbursement,
  createReimbursement,
  deleteReimbursement,
  markReceived,
  rejectReimbursement,
  reopenReimbursement,
} from "@/modules/reimbursements/application/manage-reimbursements";
import { getAccountBalances, getTransaction } from "@/modules/transactions";
import { addDays } from "@/shared/domain";
import { prisma } from "@/shared/infrastructure";
import { TODAY, categoryId, createChecking, createUser, unwrap } from "./helpers";

afterAll(() => prisma.$disconnect());

const claim = {
  kind: "HEALTH_PLAN" as const,
  provider: "Isapre Colmena",
  description: "Consulta traumatólogo",
  requestedOn: TODAY,
  currency: "CLP" as const,
};

async function balanceOf(userId: string, accountId: string) {
  return (await getAccountBalances(userId, TODAY)).get(accountId)?.posted;
}

describe("reimbursements", () => {
  it("goes from in review to approved to received, recording the income", async () => {
    const userId = await createUser();
    const account = await createChecking(userId, "100000");
    const { id } = unwrap(
      await createReimbursement(userId, { ...claim, estimatedAmount: "20000" }),
    );

    let [totals] = await getReimbursementTotals(userId, TODAY);
    expect(totals).toMatchObject({ inReviewCount: 1, estimated: 20_000, approved: 0 });

    // The window cannot end before it starts.
    const reversed = await approveReimbursement(userId, id, {
      amount: "18.500",
      expectedFrom: addDays(TODAY, 10),
      expectedTo: addDays(TODAY, 5),
    });
    expect(reversed.ok).toBe(false);

    unwrap(
      await approveReimbursement(userId, id, {
        amount: "18.500",
        expectedFrom: addDays(TODAY, -10),
        expectedTo: addDays(TODAY, -1),
      }),
    );
    [totals] = await getReimbursementTotals(userId, TODAY);
    expect(totals).toMatchObject({ approved: 18_500, approvedCount: 1, lateCount: 1 });

    unwrap(
      await markReceived(userId, id, {
        amount: "18.500",
        date: TODAY,
        accountId: account.id,
        categoryId: await categoryId(userId, "Reembolsos"),
      }),
    );
    const [received] = await listReimbursements(userId);
    expect(received).toMatchObject({ status: "RECEIVED", receivedAmount: 18_500 });
    expect(received?.transactionId).not.toBeNull();
    const income = await getTransaction(userId, received!.transactionId!);
    expect(income).toMatchObject({ kind: "INCOME", amount: 18_500 });
    expect(await balanceOf(userId, account.id)).toBe(118_500);
    expect(await getReimbursementTotals(userId, TODAY)).toEqual([]);

    // Reopening removes the income and goes back to "por recibir".
    unwrap(await reopenReimbursement(userId, id));
    const [reopened] = await listReimbursements(userId);
    expect(reopened).toMatchObject({ status: "APPROVED", transactionId: null, receivedOn: null });
    expect(await balanceOf(userId, account.id)).toBe(100_000);
  });

  it("can be received without approval or account, and rejected claims are closed", async () => {
    const userId = await createUser();
    const direct = unwrap(await createReimbursement(userId, claim));
    unwrap(await markReceived(userId, direct.id, { amount: "7000", date: TODAY }));

    const rejected = unwrap(await createReimbursement(userId, { ...claim, description: "Lentes" }));
    unwrap(await rejectReimbursement(userId, rejected.id));
    const approveClosed = await approveReimbursement(userId, rejected.id, {
      amount: "1000",
      expectedFrom: TODAY,
      expectedTo: TODAY,
    });
    expect(approveClosed.ok).toBe(false);

    const list = await listReimbursements(userId);
    expect(list.map((r) => r.status).sort()).toEqual(["RECEIVED", "REJECTED"]);
    expect(list.find((r) => r.status === "RECEIVED")?.transactionId).toBeNull();
  });

  it("rejects an account in another currency and keeps users apart", async () => {
    const userId = await createUser();
    const other = await createUser();
    const account = await createChecking(userId);
    const { id } = unwrap(await createReimbursement(userId, { ...claim, currency: "USD" }));

    const wrongCurrency = await markReceived(userId, id, {
      amount: "10",
      date: TODAY,
      accountId: account.id,
      categoryId: await categoryId(userId, "Reembolsos"),
    });
    expect(wrongCurrency.ok).toBe(false);
    if (!wrongCurrency.ok) expect(wrongCurrency.error.field).toBe("accountId");

    expect((await deleteReimbursement(other, id)).ok).toBe(false);
    expect(await listReimbursements(other)).toEqual([]);
    unwrap(await deleteReimbursement(userId, id));
    expect(await listReimbursements(userId)).toEqual([]);
  });
});
