import { describe, expect, it } from "vitest";
import { type LocalTime, isLocalTime, minutesOf, timeIn } from "./local-time";

describe("local time", () => {
  it("accepts 24 h HH:MM only", () => {
    expect(isLocalTime("00:00")).toBe(true);
    expect(isLocalTime("13:05")).toBe(true);
    expect(isLocalTime("23:59")).toBe(true);
    expect(isLocalTime("24:00")).toBe(false);
    expect(isLocalTime("9:30")).toBe(false);
    expect(isLocalTime("12:60")).toBe(false);
  });

  it("reads the time of day in a time zone", () => {
    // 2026-07-01 16:30 UTC is 12:30 in Santiago (UTC-4 in winter) and 01:30 next day in Tokyo.
    const now = new Date("2026-07-01T16:30:00Z");
    expect(timeIn("America/Santiago", now)).toBe("12:30");
    expect(timeIn("Asia/Tokyo", now)).toBe("01:30");
    expect(timeIn("UTC", new Date("2026-07-01T00:05:00Z"))).toBe("00:05");
  });

  it("counts minutes since midnight", () => {
    expect(minutesOf("00:00" as LocalTime)).toBe(0);
    expect(minutesOf("13:45" as LocalTime)).toBe(13 * 60 + 45);
  });
});
