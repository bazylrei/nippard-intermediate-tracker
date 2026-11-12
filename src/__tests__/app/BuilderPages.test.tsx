import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { BuilderProgram, ProgramRow } from "@/lib/types";

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, useParams: () => ({ programId: "prog-1" }) }));
vi.mock("@/lib/auth", () => ({ getSignedInUser: vi.fn().mockResolvedValue({ id: "user-1" }) }));

const db = vi.hoisted(() => ({
  getPrograms: vi.fn(), toggleProgramPublic: vi.fn(), getBuilderProgram: vi.fn(), getAllExercises: vi.fn(),
  addProgramDay: vi.fn(), updateProgramDayExercise: vi.fn(), updateProgram: vi.fn(), addProgramWeek: vi.fn(),
  addExerciseToDay: vi.fn(), duplicateProgramWeek: vi.fn(), deleteProgramDayExercise: vi.fn(),
  deleteProgramDay: vi.fn(), deleteProgramWeek: vi.fn(),
}));
vi.mock("@/lib/db", () => db);

import BuilderPage from "@/app/(main)/builder/page";
import ProgramEditorPage from "@/app/(main)/builder/[programId]/page";

const program: BuilderProgram = {
  id: "prog-1", name: "My Plan", description: null, category: null, isPublic: false,
  createdBy: "user-1", totalWeeks: 1, userCount: 1,
  // Day index 1 was deleted earlier: indexes 0 and 2 remain.
  days: [
    { pdId: "d0", week: 1, dayIndex: 0, dayType: "push", exercises: [] },
    { pdId: "d2", week: 1, dayIndex: 2, dayType: "pull", exercises: [] },
  ],
};
const row: ProgramRow = {
  id: "prog-1", name: "My Plan", description: null, category: null, totalWeeks: 1,
  createdBy: "user-1", isPublic: false, createdAt: "", userCount: 1,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  db.getBuilderProgram.mockResolvedValue(program);
  db.getAllExercises.mockResolvedValue([]);
  db.getPrograms.mockResolvedValue([row]);
  db.addProgramDay.mockResolvedValue({ pdId: "d3", week: 1, dayIndex: 3, dayType: "legs", exercises: [] });
});

describe("Program editor", () => {
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

describe("Builder list", () => {
  it("reverts the public toggle and shows an alert when saving fails", async () => {
    db.toggleProgramPublic.mockRejectedValue(new Error("offline"));
    render(<BuilderPage />);
    fireEvent.click(await screen.findByTitle("Make public"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't change who can see this program");
    expect(screen.getByTitle("Make public")).toBeInTheDocument();
  });

  it("explains when programs can't be loaded", async () => {
    db.getPrograms.mockRejectedValue(new Error("offline"));
    render(<BuilderPage />);
    expect(await screen.findByText(/Couldn.t load programs/)).toBeInTheDocument();
  });
});
