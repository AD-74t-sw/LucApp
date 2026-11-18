import { z } from "zod";
import {
  checkbox,
  choice,
  currency,
  id,
  optionalAmount,
  optionalInteger,
  optionalText,
  text,
} from "@/shared/application/fields";
import { ACCOUNT_TYPES } from "../domain/account";
import { CARD_NETWORKS } from "../domain/card";

const accountFields = {
  name: text(60),
  institution: optionalText(60),
  openingBalance: optionalAmount(),
  creditLimit: optionalAmount(),
  closingDay: optionalInteger(1, 31),
  dueDay: optionalInteger(1, 31),
  /** Credit cards only: also carry debt in the other currency (CLP <-> USD). */
  international: checkbox().optional(),
  secondaryCreditLimit: optionalAmount(),
  secondaryOpeningBalance: optionalAmount(),
};

export const createAccountSchema = z.object({
  ...accountFields,
  type: choice(ACCOUNT_TYPES),
  currency: currency(),
});
export type CreateAccountInput = z.infer<typeof createAccountSchema>;

/** Type and currency are fixed once the account exists. */
export const updateAccountSchema = z.object(accountFields);
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;

const cardFields = {
  name: text(60),
  network: choice(CARD_NETWORKS),
  last4: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z
      .string()
      .regex(/^\d{4}$/, "Deben ser 4 dígitos.")
      .optional(),
  ),
};

export const createCardSchema = z.object({
  ...cardFields,
  accountId: id("Selecciona una cuenta."),
});
export type CreateCardInput = z.infer<typeof createCardSchema>;

export const updateCardSchema = z.object(cardFields);
export type UpdateCardInput = z.infer<typeof updateCardSchema>;
