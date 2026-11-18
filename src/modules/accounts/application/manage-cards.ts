import { type Result, notFound, ok } from "@/shared/domain";
import { type Card, validateCardAccount } from "../domain/card";
import { accountRepository } from "../infrastructure/account-repository";
import { cardRepository } from "../infrastructure/card-repository";
import type { CreateCardInput, UpdateCardInput } from "./account-schemas";

export async function createCard(userId: string, input: CreateCardInput): Promise<Result<Card>> {
  const account = await accountRepository.findById(userId, input.accountId);
  if (!account) return notFound("La cuenta");
  const valid = validateCardAccount(account);
  if (!valid.ok) return valid;
  return ok(
    await cardRepository.create(userId, account.id, {
      name: input.name,
      network: input.network,
      last4: input.last4 ?? null,
    }),
  );
}

export async function updateCard(
  userId: string,
  id: string,
  input: UpdateCardInput,
): Promise<Result<void>> {
  if (!(await cardRepository.findById(userId, id))) return notFound("La tarjeta");
  await cardRepository.update(userId, id, {
    name: input.name,
    network: input.network,
    last4: input.last4 ?? null,
  });
  return ok();
}

export async function setCardArchived(
  userId: string,
  id: string,
  archived: boolean,
): Promise<Result<void>> {
  if (!(await cardRepository.findById(userId, id))) return notFound("La tarjeta");
  await cardRepository.setArchived(userId, id, archived);
  return ok();
}

export async function deleteCard(userId: string, id: string): Promise<Result<void>> {
  if (!(await cardRepository.findById(userId, id))) return notFound("La tarjeta");
  await cardRepository.delete(userId, id);
  return ok();
}
