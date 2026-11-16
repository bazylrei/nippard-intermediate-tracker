import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { BuilderProgram } from "@/lib/types";

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, useParams: () => ({ programId: "prog-1" }) }));
vi.mock("@/lib/auth", () => ({ getSignedInUser: vi.fn().mockResolvedValue({ id: "user-1" }) }));

const db = vi.hoisted(() => ({
  toggleProgramPublic: vi.fn(), getBuilderProgram: vi.fn(), getAllExercises: vi.fn(),
  addProgramDay: vi.fn(), updateProgramDayExercise: vi.fn(), updateProgram: vi.fn(), addProgramWeek: vi.fn(),
  addExerciseToDay: vi.fn(), duplicateProgramWeek: vi.fn(), deleteProgramDayExercise: vi.fn(),
  deleteProgramDay: vi.fn(), deleteProgramWeek: vi.fn(),
}));
vi.mock("@/lib/db", () => db);

import ProgramEditorPage from "@/app/(main)/programs/[programId]/edit/page";

const program: BuilderProgram = {
  id: "prog-1", name: "My Plan", description: null, category: null, isPublic: false,
  createdBy: "user-1", totalWeeks: 1, userCount: 1,
  // Day index 1 was deleted earlier: indexes 0 and 2 remain.
  days: [
    { pdId: "d0", week: 1, dayIndex: 0, dayType: "push", exercises: [] },
    { pdId: "d2", week: 1, dayIndex: 2, dayType: "pull", exercises: [] },
  ],
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  db.getBuilderProgram.mockResolvedValue(program);
  db.getAllExercises.mockResolvedValue([]);
  db.addProgramDay.mockResolvedValue({ pdId: "d3", week: 1, dayIndex: 3, dayType: "legs", exercises: [] });
});

describe("Program editor", () => {
  it("is only for those who can edit: anyone else is sent to the preview", async () => {
    db.getBuilderProgram.mockResolvedValue({ ...program, createdBy: "someone-else" });
    render(<ProgramEditorPage />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/programs/prog-1"));
    expect(screen.queryByText(/Add day/)).toBeNull();
    expect(screen.queryByRole("button", { name: /Private|Public/ })).toBeNull();
  });

  it("stays on the editor for the creator", async () => {
    render(<ProgramEditorPage />);
    await screen.findByText(/Add day/);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("goes back to the preview, not the list", async () => {
    render(<ProgramEditorPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Back to preview" }));
    expect(router.push).toHaveBeenCalledWith("/programs/prog-1");
  });

  it("adds a day after the highest index, not at the day count (regression)", async () => {
    render(<ProgramEditorPage />);
    fireEvent.click(await screen.findByText(/Add day/));
    fireEvent.click(screen.getByRole("button", { name: "Legs" }));
    await waitFor(() => expect(db.addProgramDay).toHaveBeenCalledWith("prog-1", 1, 3, "legs"));
    expect(await screen.findByText("— Legs")).toBeInTheDocument();
  });

  it("shows an alert and leaves the program unchanged when adding a day fails", async () => {
    db.addProgramDay.mockRejectedValue(new Error("offline"));
    render(<ProgramEditorPage />);
    fireEvent.click(await screen.findByText(/Add day/));
    fireEvent.click(screen.getByRole("button", { name: "Legs" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't add the day");
    expect(screen.queryByText("— Legs")).toBeNull();
  });

  it("reverts the public toggle when saving it fails", async () => {
    db.toggleProgramPublic.mockRejectedValue(new Error("offline"));
    render(<ProgramEditorPage />);
    fireEvent.click(await screen.findByRole("button", { name: /Private/ }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Private/ })).toBeInTheDocument();
  });

  it("explains instead of loading forever when the program can't be loaded", async () => {
    db.getBuilderProgram.mockRejectedValue(new Error("offline"));
    render(<ProgramEditorPage />);
    expect(await screen.findByText(/Couldn.t load this program/)).toBeInTheDocument();
  });
});
