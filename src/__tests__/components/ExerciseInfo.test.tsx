import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { Exercise } from "@/lib/types";
import ExerciseInfo from "@/components/workout/ExerciseInfo";

const alt = (id: string, name: string) => ({ id, name, alternates: [], formNote: "" }) as unknown as Exercise;
const bench = { id: "bench", name: "Bench Press", formNote: "", alternates: [alt("db-bench", "DB Bench Press")] } as unknown as Exercise;
const noAlternates = { id: "curl", name: "Curl", formNote: "", alternates: [] } as unknown as Exercise;

function renderInfo(over: Partial<Parameters<typeof ExerciseInfo>[0]> = {}) {
  const onOpenSwap = vi.fn();
  render(<ExerciseInfo exercise={bench} originalExercise={bench} canSwap note={undefined} onOpenSwap={onOpenSwap} onOpenNotes={vi.fn()} {...over} />);
  return onOpenSwap;
}

describe("ExerciseInfo swap", () => {
  it("offers to swap when the exercise has alternates", () => {
    const onOpenSwap = renderInfo();
    fireEvent.click(screen.getByRole("button", { name: "Swap exercise" }));
    expect(onOpenSwap).toHaveBeenCalledOnce();
  });

  it("doesn't offer a swap once the exercise can't change (a set is logged)", () => {
    renderInfo({ canSwap: false });
    expect(screen.queryByRole("button", { name: "Swap exercise" })).toBeNull();
  });

  it("doesn't offer a swap for an exercise with no alternates", () => {
    renderInfo({ exercise: noAlternates, originalExercise: noAlternates });
    expect(screen.queryByRole("button", { name: "Swap exercise" })).toBeNull();
  });

  it("says which exercise it replaces after a swap, and nothing otherwise", () => {
    renderInfo({ exercise: alt("db-bench", "DB Bench Press") });
    expect(screen.getByRole("heading", { name: "DB Bench Press" })).toBeInTheDocument();
    expect(screen.getByText("Instead of Bench Press")).toBeInTheDocument();
  });

  it("shows no 'instead of' on the slot's own exercise", () => {
    renderInfo();
    expect(screen.queryByText(/Instead of/)).toBeNull();
  });
});
