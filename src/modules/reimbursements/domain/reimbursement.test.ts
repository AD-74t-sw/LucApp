import { describe, expect, it } from "vitest";
import type { LocalDate } from "@/shared/domain";
import {
  type Reimbursement,
  arrivalOf,
  reopenedStatus,
  sortForDisplay,
  totalsByCurrency,
  validateApproval,
} from "./reimbursement";

const d = (value: string) => value as LocalDate;

function claim(overrides: Partial<Reimbursement> = {}): Reimbursement {
  return {
    id: "r1",
    kind: "HEALTH_PLAN",
    provider: "Isapre Colmena",
    description: "Consulta",
    currency: "CLP",
    requestedOn: d("2026-11-01"),
    estimatedAmount: null,
    status: "IN_REVIEW",
    amount: null,
    expectedFrom: null,
    expectedTo: null,
    receivedOn: null,
    receivedAmount: null,
    note: null,
    transactionId: null,
    ...overrides,
  };
}

const approved = (from: string, to: string, amount = 10_000) =>
  claim({ status: "APPROVED", amount, expectedFrom: d(from), expectedTo: d(to) });

describe("arrivalOf", () => {
  it("places an approved claim against its payment window", () => {
    const r = approved("2026-11-10", "2026-11-20");
    expect(arrivalOf(r, d("2026-11-05"))).toBe("UPCOMING");
    expect(arrivalOf(r, d("2026-11-10"))).toBe("IN_WINDOW");
    expect(arrivalOf(r, d("2026-11-20"))).toBe("IN_WINDOW");
    expect(arrivalOf(r, d("2026-11-21"))).toBe("LATE");
  });

  it("has no arrival while in review or once closed", () => {
    expect(arrivalOf(claim(), d("2026-11-21"))).toBeNull();
    expect(
      arrivalOf({ ...approved("2026-11-10", "2026-11-20"), status: "RECEIVED" }, d("2026-12-01")),
    ).toBeNull();
  });
});

describe("validateApproval", () => {
  it("needs a positive amount and an ordered window", () => {
    expect(validateApproval(5000, d("2026-11-10"), d("2026-11-10")).ok).toBe(true);
    expect(validateApproval(0, d("2026-11-10"), d("2026-11-20")).ok).toBe(false);
    const reversed = validateApproval(5000, d("2026-11-20"), d("2026-11-10"));
    expect(reversed.ok).toBe(false);
    if (!reversed.ok) expect(reversed.error.field).toBe("expectedTo");
  });
});

describe("reopenedStatus", () => {
  it("goes back to approved only when the amount was known", () => {
    expect(reopenedStatus({ amount: 1000 })).toBe("APPROVED");
    expect(reopenedStatus({ amount: null })).toBe("IN_REVIEW");
  });
});

describe("totalsByCurrency", () => {
  it("adds approved and estimated amounts per currency, ignoring closed claims", () => {
    const totals = totalsByCurrency(
      [
        approved("2026-11-01", "2026-11-05", 20_000),
        approved("2026-11-10", "2026-11-30", 5_000),
        claim({ estimatedAmount: 8_000 }),
        claim(),
        claim({ currency: "USD", estimatedAmount: 1_500 }),
        claim({ status: "RECEIVED", amount: 99_000 }),
      ],
      d("2026-11-15"),
    );
    expect(totals).toEqual([
      {
        currency: "CLP",
        approved: 25_000,
        approvedCount: 2,
        estimated: 8_000,
        inReviewCount: 2,
        lateCount: 1,
      },
      {
        currency: "USD",
        approved: 0,
        approvedCount: 0,
        estimated: 1_500,
        inReviewCount: 1,
        lateCount: 0,
      },
    ]);
  });
});

describe("sortForDisplay", () => {
  it("lists open claims by due date, then the history newest first", () => {
    const list = sortForDisplay([
      claim({ id: "old", status: "RECEIVED", receivedOn: d("2026-10-01") }),
      approved("2026-11-20", "2026-11-30"),
      claim({ id: "review", requestedOn: d("2026-11-02") }),
      claim({ id: "new", status: "REJECTED", requestedOn: d("2026-11-03") }),
    ]);
    expect(list.map((r) => r.id)).toEqual(["review", "r1", "new", "old"]);
  });
});
