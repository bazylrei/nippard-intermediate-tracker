import { describe, it, expect } from "vitest";
import { buildWorkoutFeed, formatRelativeDay } from "@/lib/feed";
import type { WorkoutSession } from "@/lib/types";

const session = (id: string) => ({ id }) as unknown as WorkoutSession;

describe("buildWorkoutFeed", () => {
  it("counts distinct exercises and total sets per session", () => {
    const feed = buildWorkoutFeed([session("a"), session("b")], [
      { sessionId: "a", exerciseId: "bench" },
      { sessionId: "a", exerciseId: "bench" },
      { sessionId: "a", exerciseId: "row" },
      { sessionId: "b", exerciseId: "squat" },
    ]);
    expect(feed.map((f) => [f.exerciseCount, f.setCount])).toEqual([[2, 3], [1, 1]]);
  });

  it("reports zeros for a session with no logged sets and keeps input order", () => {
    const feed = buildWorkoutFeed([session("z"), session("y")], []);
    expect(feed.map((f) => f.session.id)).toEqual(["z", "y"]);
    expect(feed[0]).toMatchObject({ exerciseCount: 0, setCount: 0 });
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
