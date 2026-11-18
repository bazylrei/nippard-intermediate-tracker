import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within, act, waitFor } from "@testing-library/react";
import type { BuilderProgram, ProgramRow } from "@/lib/types";

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, useParams: () => ({ programId: "prog-1" }) }));
vi.mock("@/lib/auth", () => ({ getSignedInUser: vi.fn().mockResolvedValue({ id: "user-1" }) }));

const db = vi.hoisted(() => ({ getPrograms: vi.fn(), getBuilderProgram: vi.fn(), createProgram: vi.fn(), newProgramId: () => "new-id" }));
vi.mock("@/lib/db", () => db);

import ProgramsPage from "@/app/(main)/programs/page";
import ProgramPreviewPage from "@/app/(main)/programs/[programId]/page";

const row = (over: Partial<ProgramRow>): ProgramRow => ({
  id: "prog-1", name: "My Plan", description: null, category: null, totalWeeks: 4,
  createdBy: "user-1", isPublic: false, createdAt: "", userCount: 1, ...over,
});

const exercise = (pdeId: string, name: string, position: number, early: number, min: number, max: number) => ({
  pdeId, exerciseId: pdeId, name, position, repRangeMin: min, repRangeMax: max, earlySetCount: early, lastSetCount: 1,
  earlySetRpeMin: 7, earlySetRpeMax: 8, lastSetRpeMin: null, lastSetRpeMax: null, lastSetTarget: "failure", warmupProtocol: "3-set",
});
const program: BuilderProgram = {
  id: "prog-1", name: "My Plan", description: "Six days of lifting", category: "Hypertrophy", isPublic: true,
  createdBy: "user-1", totalWeeks: 2, userCount: 12,
  days: [
    { pdId: "w2d0", week: 2, dayIndex: 0, dayType: "legs", exercises: [exercise("sq", "Back Squat", 0, 2, 4, 6)] },
    // Listed out of order on purpose: the preview sorts by position and day.
    { pdId: "w1d1", week: 1, dayIndex: 1, dayType: "pull", exercises: [] },
    {
      pdId: "w1d0", week: 1, dayIndex: 0, dayType: "push",
      exercises: [exercise("ohp", "Overhead Press", 1, 1, 8, 10), exercise("bp", "Bench Press", 0, 2, 6, 8)],
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  db.getPrograms.mockResolvedValue([]);
  db.getBuilderProgram.mockResolvedValue(program);
  db.createProgram.mockResolvedValue(undefined);
});

describe("My programs list", () => {
  it("leads back to Profile, which it is opened from", async () => {
    render(<ProgramsPage />);
    expect(await screen.findByRole("link", { name: "Back to Profile" })).toHaveAttribute("href", "/profile");
  });

  it("groups the programs I created apart from those available to me", async () => {
    db.getPrograms.mockResolvedValue([
      row({ id: "mine", name: "Mine" }),
      row({ id: "theirs", name: "Theirs", createdBy: "user-2", isPublic: true }),
      row({ id: "builtin", name: "Built in", createdBy: null, isPublic: true }),
    ]);
    render(<ProgramsPage />);

    const created = (await screen.findByRole("heading", { name: "Created by me" })).parentElement!;
    expect(within(created).getByText("Mine")).toBeInTheDocument();
    expect(within(created).queryByText("Theirs")).toBeNull();

    const available = screen.getByRole("heading", { name: "Available to me" }).parentElement!;
    expect(within(available).getByText("Theirs")).toBeInTheDocument();
    expect(within(available).getByText("Built in")).toBeInTheDocument();
  });

  it("leaves out a group that has no programs", async () => {
    db.getPrograms.mockResolvedValue([row({ id: "theirs", name: "Theirs", createdBy: "user-2", isPublic: true })]);
    render(<ProgramsPage />);
    await screen.findByText("Theirs");
    expect(screen.queryByRole("heading", { name: "Created by me" })).toBeNull();
  });

  it("opens a program's preview, never its editor, whoever made it", async () => {
    db.getPrograms.mockResolvedValue([row({ id: "mine", name: "Mine" }), row({ id: "theirs", name: "Theirs", createdBy: "user-2", isPublic: true })]);
    render(<ProgramsPage />);
    await screen.findByText("Mine");
    expect(screen.getByRole("link", { name: /Mine/ })).toHaveAttribute("href", "/programs/mine");
    expect(screen.getByRole("link", { name: /Theirs/ })).toHaveAttribute("href", "/programs/theirs");
    expect(screen.queryByRole("button", { name: /Edit|Make (public|private)/ })).toBeNull();
  });

  it("shows each program's weeks, users and who can see it", async () => {
    db.getPrograms.mockResolvedValue([row({ totalWeeks: 1, userCount: 1, isPublic: true, category: "Strength" })]);
    render(<ProgramsPage />);
    const card = await screen.findByRole("link", { name: /My Plan/ });
    expect(card).toHaveTextContent("1 week");
    expect(card).toHaveTextContent("1 user");
    expect(card).toHaveTextContent("Public");
    expect(card).toHaveTextContent("Strength");
  });

  it("says so when there are no programs", async () => {
    render(<ProgramsPage />);
    expect(await screen.findByText("No programs yet.")).toBeInTheDocument();
  });

  it("explains when programs can't be loaded", async () => {
    db.getPrograms.mockRejectedValue(new Error("offline"));
    render(<ProgramsPage />);
    expect(await screen.findByText(/Couldn.t load programs/)).toBeInTheDocument();
  });
});

describe("My programs — creating a program", () => {
  async function openSheet() {
    render(<ProgramsPage />);
    fireEvent.click(await screen.findByRole("button", { name: "New program" }));
    return screen.getByRole("form", { name: "New program" });
  }
  const fill = (name: string) => fireEvent.change(screen.getByLabelText("Name"), { target: { value: name } });
  const submit = () => act(async () => { fireEvent.click(screen.getByRole("button", { name: "Create program" })); });

  it("creates a program for me and opens it in the editor", async () => {
    await openSheet();
    fill("Summer Cut");
    await submit();

    expect(db.createProgram).toHaveBeenCalledWith("user-1", "new-id", { name: "Summer Cut", description: "", category: "" });
    expect(router.push).toHaveBeenCalledWith("/programs/new-id/edit");
  });

  it("stays on the list, sheet open, and says so when it can't be created", async () => {
    db.createProgram.mockRejectedValue(new Error("offline"));
    await openSheet();
    fill("Summer Cut");
    await submit();

    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't create the program");
    expect(router.push).not.toHaveBeenCalled();
  });

  it("closes without creating anything", async () => {
    await openSheet();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("form", { name: "New program" })).toBeNull()); // after its exit animation
    expect(db.createProgram).not.toHaveBeenCalled();
  });

  it("offers it even before I have any programs", async () => {
    render(<ProgramsPage />);
    expect(await screen.findByText("No programs yet.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New program" })).toBeInTheDocument();
  });
});

describe("Program preview", () => {
  it("shows what the program is", async () => {
    render(<ProgramPreviewPage />);
    expect(await screen.findByRole("heading", { name: "My Plan" })).toBeInTheDocument();
    expect(screen.getByText("Six days of lifting")).toBeInTheDocument();
    expect(screen.getByText("Hypertrophy")).toBeInTheDocument();
    expect(screen.getByText("2 weeks")).toBeInTheDocument();
    expect(screen.getByText("12 users")).toBeInTheDocument();
    expect(screen.getByText("Public")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to My programs" })).toHaveAttribute("href", "/programs");
  });

  it("lists a week's days in order, each with its exercises and sets × reps", async () => {
    render(<ProgramPreviewPage />);
    await screen.findByText("Week 1 of 2");
    const days = screen.getAllByRole("region");
    expect(days.map((d) => d.getAttribute("aria-label"))).toEqual(["Day 1", "Day 2"]);

    const push = within(days[0]);
    expect(push.getByText("Push — Hypertrophy")).toBeInTheDocument();
    expect(push.getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "Bench Press3 sets · 6–8 reps", // by position, not as stored
      "Overhead Press2 sets · 8–10 reps",
    ]);
    expect(within(days[1]).getByText("No exercises yet.")).toBeInTheDocument();
  });

  it("browses the other weeks", async () => {
    render(<ProgramPreviewPage />);
    await screen.findByText("Week 1 of 2");
    expect(screen.getByRole("button", { name: "Previous week" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Next week" }));
    expect(screen.getByText("Week 2 of 2")).toBeInTheDocument();
    expect(screen.getByText("Back Squat")).toBeInTheDocument();
    expect(screen.queryByText("Bench Press")).toBeNull();
    expect(screen.getByRole("button", { name: "Next week" })).toBeDisabled();
  });

  it("is read-only: no editing controls for anyone", async () => {
    render(<ProgramPreviewPage />);
    await screen.findByText("Week 1 of 2");
    expect(screen.queryByRole("button", { name: /Add|Delete|Duplicate/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Private|Public/ })).toBeNull();
  });

  it("offers Edit to the creator, linking to the editor", async () => {
    render(<ProgramPreviewPage />);
    expect(await screen.findByRole("link", { name: "Edit" })).toHaveAttribute("href", "/programs/prog-1/edit");
  });

  it("offers no Edit to anyone who can't edit it", async () => {
    db.getBuilderProgram.mockResolvedValue({ ...program, createdBy: "user-2" });
    render(<ProgramPreviewPage />);
    await screen.findByText("Week 1 of 2");
    expect(screen.queryByRole("link", { name: "Edit" })).toBeNull();
  });

  it("says so when a program has no workouts", async () => {
    db.getBuilderProgram.mockResolvedValue({ ...program, totalWeeks: 0, days: [] });
    render(<ProgramPreviewPage />);
    expect(await screen.findByText("This program has no workouts yet.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next week" })).toBeNull();
  });

  it("says so when it isn't found, and when it can't be loaded", async () => {
    db.getBuilderProgram.mockResolvedValue(null);
    const { unmount } = render(<ProgramPreviewPage />);
    expect(await screen.findByText("Program not found.")).toBeInTheDocument();
    unmount();

    db.getBuilderProgram.mockRejectedValue(new Error("offline"));
    render(<ProgramPreviewPage />);
    expect(await screen.findByText(/Couldn.t load this program/)).toBeInTheDocument();
  });
});
