import { describe, it, expect } from "vitest";
import { formatCalendarDate, formatRelativeDay, formatLongDate, formatElapsed, localYmd, startOfWeek } from "@/lib/dates";

describe("formatCalendarDate", () => {
  it("formats YYYY-MM-DD without shifting the day across timezones", () => {
    expect(formatCalendarDate("2026-11-05")).toBe("Nov 5");
    expect(formatCalendarDate("2026-01-31")).toBe("Jan 31");
  });
});

describe("formatLongDate", () => {
  it("includes weekday, month and day", () => {
    const text = formatLongDate(new Date(2026, 10, 12, 12).toISOString());
    expect(text).toMatch(/Thu/);
    expect(text).toMatch(/Nov/);
    expect(text).toMatch(/12/);
  });
});

describe("formatRelativeDay", () => {
  const now = new Date(2026, 10, 12, 9, 0); // Nov 12, 09:00 local

  it("says Today for any time on the same calendar day, even later than now", () => {
    expect(formatRelativeDay(new Date(2026, 10, 12, 0, 5).toISOString(), now)).toBe("Today");
    expect(formatRelativeDay(new Date(2026, 10, 12, 23, 0).toISOString(), now)).toBe("Today");
  });
  it("uses calendar days, not 24h windows, for Yesterday", () => {
    expect(formatRelativeDay(new Date(2026, 10, 11, 23, 59).toISOString(), now)).toBe("Yesterday");
  });
  it("uses 'N days ago' under a week and a short date after that", () => {
    expect(formatRelativeDay(new Date(2026, 10, 9, 12).toISOString(), now)).toBe("3 days ago");
    expect(formatRelativeDay(new Date(2026, 10, 6, 12).toISOString(), now)).toBe("6 days ago");
    expect(formatRelativeDay(new Date(2026, 10, 5, 12).toISOString(), now)).toBe("Nov 5");
  });
});

describe("formatElapsed", () => {
  it("shows minutes and zero-padded seconds under an hour", () => {
    expect(formatElapsed(0)).toBe("0:00");
    expect(formatElapsed(247)).toBe("4:07");
    expect(formatElapsed(3599)).toBe("59:59");
  });
  it("adds hours, zero-padding the minutes, from an hour up", () => {
    expect(formatElapsed(3600)).toBe("1:00:00");
    expect(formatElapsed(3729)).toBe("1:02:09");
  });
  it("drops fractions and treats negative durations (clock skew) as zero", () => {
    expect(formatElapsed(61.9)).toBe("1:01");
    expect(formatElapsed(-5)).toBe("0:00");
  });
});

describe("localYmd", () => {
  it("uses the local calendar day, zero-padded", () => {
    expect(localYmd(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });
});

describe("startOfWeek", () => {
  const wed = new Date(2026, 10, 18, 9); // Wednesday 18 Nov 2026

  it("goes back to the chosen first day", () => {
    expect(startOfWeek(wed, 1)).toBe("2026-11-16"); // Monday
    expect(startOfWeek(wed, 0)).toBe("2026-11-15"); // Sunday
    expect(startOfWeek(wed, 4)).toBe("2026-11-12"); // Thursday: last week's
  });

  it("is the same day when today is the first day", () => {
    expect(startOfWeek(new Date(2026, 10, 16, 0, 5), 1)).toBe("2026-11-16");
  });

  it("crosses month and year boundaries", () => {
    expect(startOfWeek(new Date(2026, 0, 1), 1)).toBe("2025-12-29"); // Thu 1 Jan 2026
  });
});
