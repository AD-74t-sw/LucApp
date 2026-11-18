import { z } from "zod";
import { COST_TYPES, NECESSITIES } from "@/modules/categories";
import {
  amount,
  choice,
  currency,
  id,
  localDate,
  optionalChoice,
  optionalId,
  optionalLocalDate,
  optionalText,
  text,
} from "@/shared/application/fields";
import { DEBT_DIRECTIONS } from "../domain/debt";

export const personSchema = z.object({
  name: text(80),
  note: optionalText(300),
});
export type PersonInput = z.infer<typeof personSchema>;

/** Fields a debt keeps editable after creation. */
const editableDebtFields = {
  personId: id("Selecciona una persona."),
  direction: choice(DEBT_DIRECTIONS),
  amount: amount(),
  date: localDate(),
  dueDate: optionalLocalDate(),
  description: text(120),
  categoryId: id("Selecciona una categoría."),
  costType: optionalChoice(COST_TYPES),
  necessity: optionalChoice(NECESSITIES),
};

export const debtSchema = z.object({
  ...editableDebtFields,
  currency: currency(),
  /** When set, the money movement is also registered on this account. */
  accountId: optionalId(),
});
export type DebtInput = z.infer<typeof debtSchema>;

/** Currency and account stay fixed: the account movement already exists in that currency. */
export const updateDebtSchema = z.object(editableDebtFields);
export type UpdateDebtInput = z.infer<typeof updateDebtSchema>;

export const paymentSchema = z.object({
  amount: amount(),
  date: localDate(),
  note: optionalText(200),
  accountId: optionalId(),
});
export type PaymentInput = z.infer<typeof paymentSchema>;

/** The account of a payment cannot change; its movement is updated in place. */
export const updatePaymentSchema = paymentSchema.omit({ accountId: true });
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;
