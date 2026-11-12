import { describe, it, expect } from "vitest";
import { buildWorkoutFeed } from "@/lib/feed";
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
