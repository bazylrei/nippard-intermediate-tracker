import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// The player needs WebGL, which jsdom lacks; its behaviour is tested separately with the stage mocked.
vi.mock("next/dynamic", () => ({ default: () => () => <div data-testid="player" /> }));

import ExerciseDemo from "@/components/exercise-animation/ExerciseDemo";

describe("ExerciseDemo", () => {
  it("shows the demo for a built-in exercise that has one", () => {
    render(<ExerciseDemo exercise={{ name: "Goblet Squat", createdBy: null }} />);
    expect(screen.getByRole("region", { name: "How to do Goblet Squat" })).toContainElement(screen.getByTestId("player"));
  });

  it("shows nothing for a custom exercise that happens to share the name", () => {
    const { container } = render(<ExerciseDemo exercise={{ name: "Goblet Squat", createdBy: "user-1" }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows nothing for an exercise without a demo", () => {
    const { container } = render(<ExerciseDemo exercise={{ name: "Pec Deck", createdBy: null }} />);
    expect(container).toBeEmptyDOMElement();
  });
});
