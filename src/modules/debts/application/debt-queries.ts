import { type CurrencyBalance, type Person, balancesByCurrency } from "../domain/debt";
import {
  type DebtListItem,
  debtRepository,
  personRepository,
} from "../infrastructure/debt-repository";

export type PersonSummary = Person & {
  balances: CurrencyBalance[];
  openDebts: number;
};

export async function listPeopleWithBalances(userId: string): Promise<PersonSummary[]> {
  const [people, debts] = await Promise.all([
    personRepository.list(userId),
    debtRepository.list(userId),
  ]);
  return people.map((person) => {
    const own = debts.filter((d) => d.personId === person.id);
    return {
      ...person,
      balances: balancesByCurrency(own),
      openDebts: own.filter((d) => !d.settled).length,
    };
  });
}

export async function getPersonWithDebts(
  userId: string,
  personId: string,
): Promise<{ person: Person; debts: DebtListItem[]; balances: CurrencyBalance[] } | null> {
  const person = await personRepository.findById(userId, personId);
  if (!person) return null;
  const debts = await debtRepository.list(userId, { personId });
  return { person, debts, balances: balancesByCurrency(debts) };
}

/** Totals across everyone, per currency. */
export async function getDebtTotals(userId: string): Promise<CurrencyBalance[]> {
  return balancesByCurrency(await debtRepository.list(userId));
}

export function getDebt(userId: string, debtId: string): Promise<DebtListItem | null> {
  return debtRepository.findById(userId, debtId);
}

export function listPeople(userId: string): Promise<Person[]> {
  return personRepository.list(userId);
}
