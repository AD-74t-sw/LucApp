import { z } from "zod";
import { COST_TYPES, NECESSITIES } from "@/modules/categories";
import {
  amount,
  id,
  integer,
  localDate,
  optionalAmount,
  optionalChoice,
  optionalCurrency,
  optionalId,
  optionalText,
  text,
} from "@/shared/application/fields";
import { isLocalDate, type LocalDate } from "@/shared/domain";
import { MAX_INSTALLMENTS } from "../domain/installment-schedule";
import { TRANSACTION_KINDS } from "../domain/transaction";

const movementFields = {
  accountId: id("Selecciona una cuenta."),
  categoryId: id("Selecciona una categoría."),
  amount: amount(),
  date: localDate(),
  description: text(120),
  note: optionalText(500),
  /** For cards with an international quota; defaults to the account currency. */
  currency: optionalCurrency(),
};

const classificationFields = {
  costType: optionalChoice(COST_TYPES),
  necessity: optionalChoice(NECESSITIES),
};

export const expenseSchema = z.object({
  ...movementFields,
  ...classificationFields,
  cardId: optionalId(),
});
export type ExpenseInput = z.infer<typeof expenseSchema>;

export const incomeSchema = z.object(movementFields);
export type IncomeInput = z.infer<typeof incomeSchema>;

/** Editing keeps the kind; classification fields are ignored for incomes. */
export const updateTransactionSchema = expenseSchema;
export type UpdateTransactionInput = ExpenseInput;

export const transferSchema = z.object({
  fromAccountId: id("Selecciona la cuenta de origen."),
  toAccountId: id("Selecciona la cuenta de destino."),
  /** Sent, in the origin account currency. */
  amount: optionalAmount(),
  /** Received, in `toCurrency` (e.g. the dollars paid off a card). */
  toAmount: optionalAmount(),
  /** Which debt of the destination: its currency or its international one. */
  toCurrency: optionalCurrency(),
  /** Bank rate in pesos per dollar, when paying across currencies. */
  rate: optionalText(30),
  date: localDate(),
  description: optionalText(120),
});
export type TransferInput = z.infer<typeof transferSchema>;

export const installmentPurchaseSchema = z.object({
  accountId: id("Selecciona una cuenta."),
  cardId: optionalId(),
  categoryId: id("Selecciona una categoría."),
  totalAmount: amount(),
  installmentCount: integer(2, MAX_INSTALLMENTS),
  firstChargeDate: localDate(),
  description: text(120),
  currency: optionalCurrency(),
  ...classificationFields,
});
export type InstallmentPurchaseInput = z.infer<typeof installmentPurchaseSchema>;

/** Filters read from the URL. Invalid values are ignored instead of failing the page. */
const lenientDate = z
  .string()
  .refine(isLocalDate)
  .transform((value) => value as LocalDate)
  .optional()
  .catch(undefined);
const lenientId = z.uuid().optional().catch(undefined);

export const transactionFiltersSchema = z.object({
  from: lenientDate,
  to: lenientDate,
  accountId: lenientId,
  cardId: lenientId,
  categoryId: lenientId,
  kind: z.enum(TRANSACTION_KINDS).optional().catch(undefined),
  costType: z.enum(COST_TYPES).optional().catch(undefined),
  necessity: z.enum(NECESSITIES).optional().catch(undefined),
  q: z.string().trim().max(80).optional().catch(undefined),
  /** Missing: up to today. "only": just future-dated movements. "include": both. */
  scheduled: z.enum(["include", "only"]).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(10_000).catch(1).default(1),
});
export type TransactionFiltersInput = z.infer<typeof transactionFiltersSchema>;
