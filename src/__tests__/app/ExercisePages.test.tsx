import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@/test-utils/render";
import type { CatalogExercise } from "@/lib/types";

const router = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));
let params: Record<string, string> = {};
vi.mock("next/navigation", () => ({ useRouter: () => router, useParams: () => params }));
vi.mock("@/lib/auth", () => ({ onAuthUserChange: () => () => {}, getSignedInUser: vi.fn().mockResolvedValue({ id: "user-1" }) }));

const db = vi.hoisted(() => ({
  getCatalog: vi.fn(), getCatalogExercise: vi.fn(), createExercise: vi.fn(), updateExercise: vi.fn(),
  deleteExercise: vi.fn(), newExerciseId: vi.fn(),
}));
vi.mock("@/lib/db", () => db);

import ExercisesPage from "@/app/(main)/exercises/page";
import NewExercisePage from "@/app/(main)/exercises/new/page";
import ExerciseDetailPage from "@/app/(main)/exercises/[exerciseId]/page";
import EditExercisePage from "@/app/(main)/exercises/[exerciseId]/edit/page";

const exercise = (over: Partial<CatalogExercise> = {}): CatalogExercise => ({
  id: "r-bench", name: "Bench Press", muscleGroup: "chest", equipment: "barbell", restSeconds: [120, 180],
  warmupProtocol: "3-set", isBodyweight: false, weightPerSide: false, formNote: null, instructions: null,
  youtubeUrl: null, createdBy: null, ...over,
});
const mine = exercise({ id: "custom-1", name: "Cable Fly", equipment: "cable", createdBy: "user-1", restSeconds: [60, 90] });

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  params = {};
  db.getCatalog.mockResolvedValue([exercise(), mine, exercise({ id: "r-squat", name: "Squat", muscleGroup: "quads" })]);
  db.newExerciseId.mockReturnValue("custom-new");
  db.createExercise.mockResolvedValue(undefined);
  db.updateExercise.mockResolvedValue(undefined);
});

describe("Exercises list", () => {
  it("groups exercises by muscle group and marks your own", async () => {
    render(<ExercisesPage />);
    const chest = (await screen.findByRole("heading", { name: "Chest" })).closest("section")!;
    expect(within(chest).getAllByRole("link").map((l) => l.textContent)).toEqual(["Bench PressBarbell", "Cable FlyCableYours"]);
    expect(screen.getByRole("heading", { name: "Quads" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Cable Fly/ })).toHaveAttribute("href", "/exercises/custom-1");
  });

  it("filters by name", async () => {
    render(<ExercisesPage />);
    fireEvent.change(await screen.findByRole("searchbox", { name: "Search exercises" }), { target: { value: "squ" } });
    expect(screen.getByRole("link", { name: /Squat/ })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Chest" })).toBeNull();
  });

  it("links to adding one and back to Profile", async () => {
    render(<ExercisesPage />);
    expect(await screen.findByRole("link", { name: "Add" })).toHaveAttribute("href", "/exercises/new");
    expect(screen.getByRole("link", { name: "Back to Profile" })).toHaveAttribute("href", "/profile");
  });

  it("explains instead of loading forever when the catalogue can't load", async () => {
    db.getCatalog.mockRejectedValue(new Error("offline"));
    render(<ExercisesPage />);
    expect(await screen.findByText(/Couldn't load exercises/)).toBeInTheDocument();
  });
});

describe("New exercise", () => {
  it("shows what's wrong instead of saving an invalid exercise", () => {
    render(<NewExercisePage />);
    fireEvent.click(screen.getByRole("button", { name: "Add exercise" }));
    expect(screen.getByText("Give it a name.")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveAttribute("aria-invalid", "true");
    expect(db.createExercise).not.toHaveBeenCalled();
  });

  it("saves and opens the new exercise", async () => {
    render(<NewExercisePage />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Cable Fly" } });
    fireEvent.change(screen.getByLabelText("Muscle group"), { target: { value: "chest" } });
    fireEvent.click(screen.getByLabelText(/per hand/));
    fireEvent.click(screen.getByRole("button", { name: "Add exercise" }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/exercises/custom-new"));
    expect(db.createExercise).toHaveBeenCalledWith("custom-new", expect.objectContaining({ name: "Cable Fly", weightPerSide: true }));
  });

  it("keeps the form and its id after a failed save, so retrying can't add it twice", async () => {
    db.createExercise.mockRejectedValueOnce(new Error("offline"));
    db.newExerciseId.mockReturnValueOnce("custom-new").mockReturnValueOnce("custom-other");
    render(<NewExercisePage />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Cable Fly" } });
    fireEvent.click(screen.getByRole("button", { name: "Add exercise" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't save the exercise");
    expect(screen.getByLabelText("Name")).toHaveValue("Cable Fly");

    fireEvent.click(screen.getByRole("button", { name: "Add exercise" }));
    await waitFor(() => expect(router.replace).toHaveBeenCalled());
    expect(db.createExercise.mock.calls.map(([id]) => id)).toEqual(["custom-new", "custom-new"]);
  });
});

describe("Exercise detail", () => {
  it("shows a built-in exercise read-only", async () => {
    params = { exerciseId: "r-bench" };
    db.getCatalogExercise.mockResolvedValue(exercise({ youtubeUrl: "https://youtu.be/b" }));
    render(<ExerciseDetailPage />);
    expect(await screen.findByRole("heading", { name: "Bench Press" })).toBeInTheDocument();
    expect(screen.getByText("120–180s")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Watch the demo/ })).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.queryByRole("link", { name: /Edit/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Delete/ })).toBeNull();
  });

  it("says so when the exercise doesn't exist or isn't visible", async () => {
    params = { exerciseId: "custom-gone" };
    db.getCatalogExercise.mockResolvedValue(null);
    render(<ExerciseDetailPage />);
    expect(await screen.findByText("Exercise not found.")).toBeInTheDocument();
  });

  it("lets you edit and, after confirming, delete your own", async () => {
    params = { exerciseId: "custom-1" };
    db.getCatalogExercise.mockResolvedValue(mine);
    db.deleteExercise.mockResolvedValue(true);
    render(<ExerciseDetailPage />);
    expect(await screen.findByRole("link", { name: /Edit/ })).toHaveAttribute("href", "/exercises/custom-1/edit");

    fireEvent.click(screen.getByRole("button", { name: /Delete exercise/ }));
    expect(db.deleteExercise).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/exercises"));
    expect(db.deleteExercise).toHaveBeenCalledWith("custom-1");
  });

  it("explains and stays when the exercise is in use", async () => {
    params = { exerciseId: "custom-1" };
    db.getCatalogExercise.mockResolvedValue(mine);
    db.deleteExercise.mockResolvedValue(false);
    render(<ExerciseDetailPage />);
    fireEvent.click(await screen.findByRole("button", { name: /Delete exercise/ }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("used in a program or in logged sets");
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("shows an alert when deleting fails", async () => {
    params = { exerciseId: "custom-1" };
    db.getCatalogExercise.mockResolvedValue(mine);
    db.deleteExercise.mockRejectedValue(new Error("offline"));
    render(<ExerciseDetailPage />);
    fireEvent.click(await screen.findByRole("button", { name: /Delete exercise/ }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't delete the exercise");
  });
});

describe("Edit exercise", () => {
  it("starts from the saved values and saves changes", async () => {
    params = { exerciseId: "custom-1" };
    db.getCatalogExercise.mockResolvedValue(mine);
    render(<EditExercisePage />);
    const name = await screen.findByLabelText("Name");
    expect(name).toHaveValue("Cable Fly");
    expect(screen.getByLabelText("Rest min (sec)")).toHaveValue("60");

    fireEvent.change(name, { target: { value: "Low Cable Fly" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/exercises/custom-1"));
    expect(db.updateExercise).toHaveBeenCalledWith("custom-1", expect.objectContaining({ name: "Low Cable Fly", restSeconds: [60, 90] }));
  });

  it("refuses to edit someone else's exercise", async () => {
    params = { exerciseId: "r-bench" };
    db.getCatalogExercise.mockResolvedValue(exercise());
    render(<EditExercisePage />);
    expect(await screen.findByText("You can only edit exercises you added.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save changes" })).toBeNull();
  });
});
