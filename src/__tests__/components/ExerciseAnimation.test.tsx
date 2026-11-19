import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// three.js needs WebGL, which jsdom lacks; the canvas itself is covered by the mannequin and motion tests.
vi.mock("next/dynamic", () => ({ default: () => () => <div data-testid="canvas" /> }));

import ExerciseAnimation from "@/components/exercise-animation/ExerciseAnimation";

describe("ExerciseAnimation", () => {
  it("shows the animation for an exercise that has one", () => {
    render(<ExerciseAnimation exerciseName="DB Curl" />);
    expect(screen.getByRole("region", { name: "How to do DB Curl" })).toBeInTheDocument();
    expect(screen.getByTestId("canvas")).toBeInTheDocument();
  });

  it("renders nothing for an exercise without one", () => {
    const { container } = render(<ExerciseAnimation exerciseName="Bench Press" />);
    expect(container).toBeEmptyDOMElement();
  });
});
