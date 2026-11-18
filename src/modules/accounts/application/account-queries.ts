import type { Db } from "@/shared/infrastructure";
import type { Account } from "../domain/account";
import type { Card } from "../domain/card";
import { accountRepository } from "../infrastructure/account-repository";
import { cardRepository } from "../infrastructure/card-repository";

export function listAccounts(
  userId: string,
  options: { includeArchived?: boolean } = {},
): Promise<Account[]> {
  return accountRepository.list(userId, options);
}

export function getAccount(userId: string, id: string, db?: Db): Promise<Account | null> {
  return accountRepository.findById(userId, id, db);
}

export function listCards(
  userId: string,
  options: { includeArchived?: boolean } = {},
): Promise<Card[]> {
  return cardRepository.list(userId, options);
}

export function getCard(userId: string, id: string, db?: Db): Promise<Card | null> {
  return cardRepository.findById(userId, id, db);
}
