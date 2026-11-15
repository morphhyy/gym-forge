import { describe, it, expect } from "vitest";
import {
  addDays,
  assertDateStr,
  diffDays,
  isDateStr,
  monthRange,
  resolveToday,
  utcTodayStr,
  weekStartSunday,
  weekdayOf,
} from "@/convex/lib/dates";

describe("isDateStr / assertDateStr", () => {
  it("accepts valid calendar dates", () => {
    expect(isDateStr("2026-11-15")).toBe(true);
    expect(isDateStr("2024-02-29")).toBe(true);
  });

  it("rejects malformed or impossible dates", () => {
    expect(isDateStr("2026-1-5")).toBe(false);
    expect(isDateStr("2026-11-15T00:00:00Z")).toBe(false);
    expect(isDateStr("2025-02-29")).toBe(false);
    expect(isDateStr("2026-13-01")).toBe(false);
    expect(isDateStr("")).toBe(false);
    expect(() => assertDateStr("nope")).toThrow();
  });
});

describe("weekdayOf", () => {
  it("returns 0=Sunday .. 6=Saturday", () => {
    expect(weekdayOf("2026-11-15")).toBe(0); // Sunday
    expect(weekdayOf("2026-11-16")).toBe(1); // Monday
    expect(weekdayOf("2026-11-21")).toBe(6); // Saturday
    expect(weekdayOf("2000-01-01")).toBe(6); // Saturday
    expect(weekdayOf("2024-02-29")).toBe(4); // Thursday
  });
});

describe("addDays", () => {
  it("adds and subtracts days", () => {
    expect(addDays("2026-11-15", 1)).toBe("2026-11-16");
    expect(addDays("2026-11-15", -1)).toBe("2026-11-14");
    expect(addDays("2026-11-15", 0)).toBe("2026-11-15");
  });

  it("crosses month, year and leap-day boundaries", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2027-01-01", -1)).toBe("2026-12-31");
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(addDays("2025-02-28", 1)).toBe("2025-03-01");
  });

  it("is unaffected by DST transitions", () => {
    // US DST ends 2026-11-01, EU DST ends 2026-10-25
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-11-01", 1)).toBe("2026-11-02");
    expect(addDays("2026-03-08", 1)).toBe("2026-03-09");
    expect(addDays("2026-10-25", -1)).toBe("2026-10-24");
  });
});

describe("diffDays", () => {
  it("returns signed day differences", () => {
    expect(diffDays("2026-11-14", "2026-11-15")).toBe(1);
    expect(diffDays("2026-11-15", "2026-11-14")).toBe(-1);
    expect(diffDays("2026-11-15", "2026-11-15")).toBe(0);
    expect(diffDays("2026-12-31", "2027-01-01")).toBe(1);
    expect(diffDays("2024-01-01", "2025-01-01")).toBe(366);
    expect(diffDays("2026-03-01", "2026-03-31")).toBe(30);
  });
});

describe("weekStartSunday", () => {
  it("returns the Sunday of the containing week", () => {
    expect(weekStartSunday("2026-11-15")).toBe("2026-11-15");
    expect(weekStartSunday("2026-11-21")).toBe("2026-11-15");
    expect(weekStartSunday("2026-11-18")).toBe("2026-11-15");
    expect(weekStartSunday("2026-01-01")).toBe("2025-12-28");
  });
});

describe("monthRange", () => {
  it("returns first and last day of the month", () => {
    expect(monthRange(2026, 11)).toEqual({ start: "2026-11-01", end: "2026-11-30" });
    expect(monthRange(2024, 2)).toEqual({ start: "2024-02-01", end: "2024-02-29" });
    expect(monthRange(2025, 2)).toEqual({ start: "2025-02-01", end: "2025-02-28" });
    expect(monthRange(2026, 12)).toEqual({ start: "2026-12-01", end: "2026-12-31" });
  });

  it("rejects invalid months", () => {
    expect(() => monthRange(2026, 0)).toThrow();
    expect(() => monthRange(2026, 13)).toThrow();
  });
});

describe("utcTodayStr / resolveToday", () => {
  it("formats the UTC date", () => {
    expect(utcTodayStr(new Date("2026-11-15T23:30:00Z"))).toBe("2026-11-15");
    expect(utcTodayStr(new Date("2026-11-16T00:30:00Z"))).toBe("2026-11-16");
  });

  it("prefers the client-supplied date", () => {
    expect(resolveToday("2026-11-14")).toBe("2026-11-14");
  });

  it("falls back to a valid date when none is supplied", () => {
    expect(isDateStr(resolveToday(undefined))).toBe(true);
  });

  it("rejects invalid client dates", () => {
    expect(() => resolveToday("11/15/2026")).toThrow();
  });
});
