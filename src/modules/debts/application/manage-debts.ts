import { getAccount } from "@/modules/accounts";
import { getCategoryWithParent, resolveClassification } from "@/modules/categories";
import { deleteDebtMovement, recordDebtMovement, updateDebtMovement } from "@/modules/transactions";
import {
  type CurrencyCode,
  type Result,
  conflict,
  notFound,
  ok,
  parseAmount,
  validationError,
  withField,
} from "@/shared/domain";
import { type Db, runInTransaction } from "@/shared/infrastructure";
import {
  type Debt,
  type DebtDirection,
  type Person,
  accountMovementAmount,
  outstanding,
  paidAmount,
  validatePayment,
  validatePaymentChange,
  validatePrincipal,
} from "../domain/debt";
import {
  type DebtChanges,
  debtRepository,
  personRepository,
} from "../infrastructure/debt-repository";
import type {
  DebtInput,
  PaymentInput,
  PersonInput,
  UpdateDebtInput,
  UpdatePaymentInput,
} from "./debt-schemas";

const OPEN_TEXT: Record<DebtDirection, string> = { I_OWE: "Préstamo de", THEY_OWE: "Préstamo a" };
const PAYMENT_TEXT: Record<DebtDirection, string> = { I_OWE: "Pago a", THEY_OWE: "Pago de" };

const openDescription = (debt: { direction: DebtDirection; description: string }, person: string) =>
  `${OPEN_TEXT[debt.direction]} ${person}: ${debt.description}`;
const paymentDescription = (
  debt: { direction: DebtDirection; description: string },
  person: string,
) => `${PAYMENT_TEXT[debt.direction]} ${person}: ${debt.description}`;

// ---------------------------------------------------------------- people

export async function createPerson(userId: string, input: PersonInput): Promise<Result<Person>> {
  const person = await personRepository.create(userId, {
    name: input.name,
    note: input.note ?? null,
  });
  return person ? ok(person) : conflict("Ya tienes una persona con ese nombre.", "name");
}

export async function updatePerson(
  userId: string,
  id: string,
  input: PersonInput,
): Promise<Result<void>> {
  if (!(await personRepository.findById(userId, id))) return notFound("La persona");
  const updated = await personRepository.update(userId, id, {
    name: input.name,
    note: input.note ?? null,
  });
  return updated ? ok() : conflict("Ya tienes una persona con ese nombre.", "name");
}

/** Removes the person, their debts, payments and the account movements they generated. */
export async function deletePerson(userId: string, id: string): Promise<Result<void>> {
  if (!(await personRepository.findById(userId, id))) return notFound("La persona");
  const debts = await debtRepository.list(userId, { personId: id });
  await runInTransaction(async (tx) => {
    for (const debt of debts) await deleteMovements(userId, debt, tx);
    await personRepository.delete(userId, id, tx);
  });
  return ok();
}

// ---------------------------------------------------------------- debts

/** If an account is given it must use the debt currency; the movement is stored there. */
async function checkAccountCurrency(
  userId: string,
  accountId: string | undefined,
  currency: CurrencyCode,
): Promise<Result<void>> {
  if (!accountId) return ok();
  const account = await getAccount(userId, accountId);
  if (!account) return withField(notFound("La cuenta"), "accountId");
  if (account.currency !== currency) {
    return validationError(
      `La cuenta está en ${account.currency}; la deuda está en ${currency}.`,
      "accountId",
    );
  }
  return ok();
}

/**
 * Validates the editable fields shared by create and update, and resolves the
 * classification from the category (same rules as a regular expense).
 */
async function buildDebtChanges(
  userId: string,
  input: UpdateDebtInput,
  currency: CurrencyCode,
): Promise<Result<{ changes: DebtChanges; person: Person }>> {
  const person = await personRepository.findById(userId, input.personId);
  if (!person) return withField(notFound("La persona"), "personId");

  const found = await getCategoryWithParent(userId, input.categoryId);
  if (!found || found.category.kind !== "EXPENSE") {
    return validationError("Elige una categoría de gasto.", "categoryId");
  }
  if (found.category.archived) return validationError("La categoría está archivada.", "categoryId");

  const principal = withField(parseAmount(input.amount, currency), "amount");
  if (!principal.ok) return principal;
  if (principal.value <= 0) return validationError("El monto debe ser mayor que cero.", "amount");
  if (input.dueDate && input.dueDate < input.date) {
    return validationError("El vencimiento no puede ser anterior a la fecha.", "dueDate");
  }

  return ok({
    person,
    changes: {
      personId: person.id,
      direction: input.direction,
      principal: principal.value,
      date: input.date,
      dueDate: input.dueDate ?? null,
      description: input.description,
      categoryId: found.category.id,
      ...resolveClassification(found.category, found.parent, {
        costType: input.costType,
        necessity: input.necessity,
      }),
    },
  });
}

export async function createDebt(
  userId: string,
  input: DebtInput,
): Promise<Result<{ debtId: string }>> {
  const built = await buildDebtChanges(userId, input, input.currency);
  if (!built.ok) return built;
  const { changes, person } = built.value;
  const accountCheck = await checkAccountCurrency(userId, input.accountId, input.currency);
  if (!accountCheck.ok) return accountCheck;

  return runInTransaction(async (tx) => {
    let transactionId: string | null = null;
    if (input.accountId) {
      const movement = await recordDebtMovement(
        userId,
        {
          accountId: input.accountId,
          amount: accountMovementAmount(changes.direction, "open", changes.principal),
          date: changes.date,
          description: openDescription(changes, person.name),
        },
        tx,
      );
      if (!movement.ok) return movement;
      transactionId = movement.value.transactionId;
    }
    const debtId = await debtRepository.create(
      userId,
      { ...changes, currency: input.currency, transactionId },
      tx,
    );
    return ok({ debtId });
  });
}

/**
 * Edits a debt. The account movements it created (on opening and on each
 * payment) are rewritten so balances stay consistent with the new amount,
 * date and direction.
 */
export async function updateDebt(
  userId: string,
  debtId: string,
  input: UpdateDebtInput,
): Promise<Result<void>> {
  const debt = await debtRepository.findById(userId, debtId);
  if (!debt) return notFound("La deuda");
  const built = await buildDebtChanges(userId, input, debt.currency);
  if (!built.ok) return built;
  const { changes, person } = built.value;
  const valid = validatePrincipal(changes.principal, paidAmount(debt));
  if (!valid.ok) return valid;

  await runInTransaction(async (tx) => {
    await debtRepository.update(userId, debt.id, changes, tx);
    if (debt.transactionId) {
      await updateDebtMovement(
        userId,
        debt.transactionId,
        {
          amount: accountMovementAmount(changes.direction, "open", changes.principal),
          date: changes.date,
          description: openDescription(changes, person.name),
        },
        tx,
      );
    }
    for (const payment of debt.payments) {
      if (!payment.transactionId) continue;
      await updateDebtMovement(
        userId,
        payment.transactionId,
        {
          amount: accountMovementAmount(changes.direction, "payment", payment.amount),
          date: payment.date,
          description: paymentDescription(changes, person.name),
        },
        tx,
      );
    }
    await debtRepository.setSettled(userId, debt.id, changes.principal === paidAmount(debt), tx);
  });
  return ok();
}

/** Registers a partial or full payment; the debt is marked settled when nothing is left. */
export async function recordPayment(
  userId: string,
  debtId: string,
  input: PaymentInput,
): Promise<Result<{ settled: boolean }>> {
  const debt = await debtRepository.findById(userId, debtId);
  if (!debt) return notFound("La deuda");
  const amount = withField(parseAmount(input.amount, debt.currency), "amount");
  if (!amount.ok) return amount;
  const valid = validatePayment(debt, amount.value);
  if (!valid.ok) return valid;
  const accountCheck = await checkAccountCurrency(userId, input.accountId, debt.currency);
  if (!accountCheck.ok) return accountCheck;
  const person = await personRepository.findById(userId, debt.personId);

  return runInTransaction(async (tx) => {
    let transactionId: string | null = null;
    if (input.accountId) {
      const movement = await recordDebtMovement(
        userId,
        {
          accountId: input.accountId,
          amount: accountMovementAmount(debt.direction, "payment", amount.value),
          date: input.date,
          description: paymentDescription(debt, person?.name ?? ""),
        },
        tx,
      );
      if (!movement.ok) return movement;
      transactionId = movement.value.transactionId;
    }
    await debtRepository.addPayment(
      userId,
      debt.id,
      { amount: amount.value, date: input.date, note: input.note ?? null, transactionId },
      tx,
    );
    const settled = outstanding(debt) - amount.value === 0;
    if (settled) await debtRepository.setSettled(userId, debt.id, true, tx);
    return ok({ settled });
  });
}

/** Edits a payment's amount, date or note, and its account movement if it has one. */
export async function updatePayment(
  userId: string,
  paymentId: string,
  input: UpdatePaymentInput,
): Promise<Result<{ settled: boolean }>> {
  const found = await debtRepository.findPayment(userId, paymentId);
  if (!found) return notFound("El abono");
  const debt = await debtRepository.findById(userId, found.debtId);
  if (!debt) return notFound("La deuda");
  const amount = withField(parseAmount(input.amount, debt.currency), "amount");
  if (!amount.ok) return amount;
  const valid = validatePaymentChange(debt, paymentId, amount.value);
  if (!valid.ok) return valid;
  const person = await personRepository.findById(userId, debt.personId);

  const paidAfter =
    paidAmount(debt) - (debt.payments.find((p) => p.id === paymentId)?.amount ?? 0) + amount.value;
  const settled = paidAfter === debt.principal;
  await runInTransaction(async (tx) => {
    await debtRepository.updatePayment(
      userId,
      paymentId,
      { amount: amount.value, date: input.date, note: input.note ?? null },
      tx,
    );
    if (found.transactionId) {
      await updateDebtMovement(
        userId,
        found.transactionId,
        {
          amount: accountMovementAmount(debt.direction, "payment", amount.value),
          date: input.date,
          description: paymentDescription(debt, person?.name ?? ""),
        },
        tx,
      );
    }
    await debtRepository.setSettled(userId, debt.id, settled, tx);
  });
  return ok({ settled });
}

export async function deletePayment(userId: string, paymentId: string): Promise<Result<void>> {
  const payment = await debtRepository.findPayment(userId, paymentId);
  if (!payment) return notFound("El abono");
  await runInTransaction(async (tx) => {
    await debtRepository.deletePayment(userId, payment.id, tx);
    if (payment.transactionId) await deleteDebtMovement(userId, payment.transactionId, tx);
    await debtRepository.setSettled(userId, payment.debtId, false, tx);
  });
  return ok();
}

export async function deleteDebt(userId: string, debtId: string): Promise<Result<void>> {
  const debt = await debtRepository.findById(userId, debtId);
  if (!debt) return notFound("La deuda");
  await runInTransaction(async (tx) => {
    await deleteMovements(userId, debt, tx);
    await debtRepository.delete(userId, debt.id, tx);
  });
  return ok();
}

/** Deletes the account movements created by a debt and its payments. */
async function deleteMovements(userId: string, debt: Debt, tx: Db): Promise<void> {
  const ids = [debt.transactionId, ...debt.payments.map((p) => p.transactionId)].filter(
    (id): id is string => id !== null,
  );
  for (const id of ids) await deleteDebtMovement(userId, id, tx);
}
