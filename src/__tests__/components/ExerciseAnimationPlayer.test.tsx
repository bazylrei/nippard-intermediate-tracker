import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { Motion } from "@/lib/animation/motion";

const stage = vi.hoisted(() => ({
  supported: true,
  instance: { setPlaying: vi.fn(), recolor: vi.fn(), dispose: vi.fn() },
  createStage: vi.fn(),
}));
vi.mock("@/components/exercise-animation/stage", () => ({
  webglAvailable: () => stage.supported,
  createStage: stage.createStage,
}));

import ExerciseAnimationPlayer from "@/components/exercise-animation/ExerciseAnimationPlayer";

const motion = { seconds: 4, peak: 0.4, prop: { kind: "none" }, targets: ["upperArm"], keyframes: [] } as unknown as Motion;

function mockReducedMotion(reduce: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("reduced-motion") ? reduce : false,
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
  }));
}

beforeEach(() => {
  vi.clearAllMocks();
  stage.supported = true;
  stage.createStage.mockReturnValue(stage.instance);
  mockReducedMotion(false);
});

describe("ExerciseAnimationPlayer", () => {
  it("starts playing, and pauses and resumes from its button", () => {
    render(<ExerciseAnimationPlayer motion={motion} />);
    expect(stage.createStage).toHaveBeenCalledWith(expect.any(HTMLElement), motion, true);

    fireEvent.click(screen.getByRole("button", { name: "Pause animation" }));
    expect(stage.instance.setPlaying).toHaveBeenLastCalledWith(false);

    fireEvent.click(screen.getByRole("button", { name: "Play animation" }));
    expect(stage.instance.setPlaying).toHaveBeenLastCalledWith(true);
  });

  it("starts on a still for someone who prefers reduced motion, who can still press play", () => {
    mockReducedMotion(true);
    render(<ExerciseAnimationPlayer motion={motion} />);
    expect(stage.createStage).toHaveBeenCalledWith(expect.any(HTMLElement), motion, false);
    expect(screen.getByRole("button", { name: "Play animation" })).toBeInTheDocument();
  });

  it("recolours when the app's theme class changes", async () => {
    render(<ExerciseAnimationPlayer motion={motion} />);
    document.documentElement.classList.add("dark");
    await new Promise((r) => setTimeout(r, 0)); // MutationObserver callbacks are async
    expect(stage.instance.recolor).toHaveBeenCalled();
    document.documentElement.classList.remove("dark");
  });

  it("tears the 3D scene down when it leaves the page", () => {
    const { unmount } = render(<ExerciseAnimationPlayer motion={motion} />);
    unmount();
    expect(stage.instance.dispose).toHaveBeenCalledTimes(1);
  });

  it("renders nothing on a device without WebGL", () => {
    stage.supported = false;
    const { container } = render(<ExerciseAnimationPlayer motion={motion} />);
    expect(container).toBeEmptyDOMElement();
    expect(stage.createStage).not.toHaveBeenCalled();
  });
});
