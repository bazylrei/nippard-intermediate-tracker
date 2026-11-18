import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { render } from "@testing-library/react";
import type { Exercise } from "@/lib/types";
import ExerciseSwapSheet from "@/components/workout/ExerciseSwapSheet";

const css = readFileSync("src/app/globals.css", "utf8");

/** Every overlay in the app, with the panel class its animation hangs on. */
const OVERLAYS: [file: string, panelClass: string][] = [
  ["src/components/SetEditSheet.tsx", "overlay-sheet"],
  ["src/components/ExerciseNotesSheet.tsx", "overlay-sheet"],
  ["src/components/programs/NewProgramSheet.tsx", "overlay-sheet"],
  ["src/components/program/StartWorkoutSheet.tsx", "overlay-sheet"],
  ["src/components/workout/ExerciseSwapSheet.tsx", "overlay-sheet"],
  ["src/components/FailureTechniqueModal.tsx", "overlay-pop"],
  ["src/components/builder/ProgramEditModal.tsx", "overlay-card"],
  ["src/components/builder/AddExerciseModal.tsx", "overlay-card"],
  ["src/components/builder/ExerciseEditModal.tsx", "overlay-card"],
  ["src/components/builder/DayTypeModal.tsx", "overlay-card"],
];

describe("overlay animation", () => {
  it.each(["overlay-backdrop", "overlay-sheet", "overlay-pop", "overlay-card"])("defines .%s", (cls) => {
    expect(css).toContain(`.${cls}`);
  });

  it("falls back to a plain fade under reduced motion", () => {
    const reduced = css.slice(css.indexOf("prefers-reduced-motion: reduce"));
    for (const cls of [".overlay-sheet", ".overlay-pop", ".overlay-card"]) expect(reduced).toContain(cls);
  });

  it.each(OVERLAYS)("%s animates its backdrop and panel (%s)", (file, panelClass) => {
    const src = readFileSync(file, "utf8");
    expect(src).toContain("overlay-backdrop");
    expect(src).toContain(panelClass);
  });

  it("puts the classes on the rendered swap sheet", () => {
    const option = (id: string) => ({ id, name: id, alternates: [] }) as unknown as Exercise;
    const { container } = render(
      <ExerciseSwapSheet options={[option("a"), option("b")]} currentId="a" defaultId="a" onChoose={vi.fn()} onClose={vi.fn()} />,
    );
    const backdrop = container.firstElementChild!;
    expect(backdrop).toHaveClass("overlay-backdrop");
    expect(backdrop.firstElementChild).toHaveClass("overlay-sheet");
  });
});
