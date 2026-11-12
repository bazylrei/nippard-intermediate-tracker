import { describe, it, expect } from "vitest";
import { formatCalendarDate, formatRelativeDay, formatLongDate } from "@/lib/dates";

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
