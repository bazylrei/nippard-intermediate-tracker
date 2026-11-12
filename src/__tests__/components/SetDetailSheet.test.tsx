import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import SetDetailSheet from "@/components/SetDetailSheet";
import type { Exercise, SetLog } from "@/lib/types";

const baseExercise: Exercise = {
  id: "ex-1",
  name: "Bench Press",
  alternates: ["DB Bench", "Cable Fly"],
  muscleGroup: "chest",
  restSeconds: [120, 180],
  warmupProtocol: "3-set",
  repRange: [6, 10],
  earlySetRpe: [7, 8],
  lastSetTarget: "failure",
  earlySetCount: 3,
  lastSetCount: 1,
  formNote: "Keep shoulder blades retracted.",
  isBodyweight: false,
  weightPerSide: false,
};

const baseSet: SetLog = {
  id: "set-1",
  sessionId: "sess-1",
  userId: "user-1",
  exerciseId: "ex-1",
  setIndex: 0,
  isLastSet: false,
  weight: 100,
  reps: 8,
  rpe: 8,
  failureHit: null,
  loggedAt: "2024-01-01T10:00:00Z",
};

const noop = vi.fn().mockResolvedValue(undefined);

// Helper: get the two grid tiles that show weight/reps/RPE in read-only mode.
// The component renders a 3-column grid; first tile is weight, second is reps, third is RPE.
function getGridTiles(container: HTMLElement) {
  return container.querySelectorAll(".grid > div");
}

// Helper: enter edit mode and return the weight/reps inputs
function enterEditMode() {
  fireEvent.click(screen.getByText("Edit"));
  // The weight input is the first number input, reps is the second
  const inputs = screen.getAllByRole("spinbutton") as HTMLInputElement[];
  return { weightInput: inputs[0], repsInput: inputs[1] };
}

// ─── Read-only view ────────────────────────────────────────────────────────────

describe("SetDetailSheet — read-only view", () => {
  it("shows weight value and unit", () => {
    const { container } = render(
      <SetDetailSheet
        set={baseSet}
        exercise={baseExercise}
        unit="kg"
        onClose={vi.fn()}
        onSave={noop}
      />
    );
    const tiles = getGridTiles(container);
    // First tile is weight
    expect(within(tiles[0] as HTMLElement).getByText("100")).toBeInTheDocument();
    expect(within(tiles[0] as HTMLElement).getByText("kg")).toBeInTheDocument();
  });

  it("shows reps value", () => {
    const { container } = render(
      <SetDetailSheet
        set={baseSet}
        exercise={baseExercise}
        unit="kg"
        onClose={vi.fn()}
        onSave={noop}
      />
    );
    const tiles = getGridTiles(container);
    // Second tile is reps
    expect(within(tiles[1] as HTMLElement).getByText("8")).toBeInTheDocument();
  });

  it("shows RPE value", () => {
    const { container } = render(
      <SetDetailSheet
        set={baseSet}
        exercise={baseExercise}
        unit="kg"
        onClose={vi.fn()}
        onSave={noop}
      />
    );
    const tiles = getGridTiles(container);
    // Third tile is RPE
    expect(within(tiles[2] as HTMLElement).getByText("8")).toBeInTheDocument();
  });

  it("shows '—' when rpe is null", () => {
    const { container } = render(
      <SetDetailSheet
        set={{ ...baseSet, rpe: null }}
        exercise={baseExercise}
        unit="kg"
        onClose={vi.fn()}
        onSave={noop}
      />
    );
    const tiles = getGridTiles(container);
    expect(within(tiles[2] as HTMLElement).getByText("—")).toBeInTheDocument();
  });

  it("shows '2×' prefix when weightPerSide is true", () => {
    render(
      <SetDetailSheet
        set={baseSet}
        exercise={{ ...baseExercise, weightPerSide: true }}
        unit="kg"
        onClose={vi.fn()}
        onSave={noop}
      />
    );
    expect(screen.getByText("2×")).toBeInTheDocument();
  });

  it("shows failure info text when failureHit is true", () => {
    render(
      <SetDetailSheet
        set={{ ...baseSet, failureHit: true }}
        exercise={baseExercise}
        unit="kg"
        onClose={vi.fn()}
        onSave={noop}
      />
    );
    expect(screen.getByText(/Failure/)).toBeInTheDocument();
    expect(screen.getByText(/Yes/)).toBeInTheDocument();
  });

  it("calls onClose when backdrop is clicked", () => {
    const onClose = vi.fn();
    const { container } = render(
      <SetDetailSheet
        set={baseSet}
        exercise={baseExercise}
        unit="kg"
        onClose={onClose}
        onSave={noop}
      />
    );
    // The backdrop is the outermost fixed div (onClick checks e.target === e.currentTarget)
    const backdrop = container.firstChild as HTMLElement;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when X button is clicked", () => {
    const onClose = vi.fn();
    render(
      <SetDetailSheet
        set={baseSet}
        exercise={baseExercise}
        unit="kg"
        onClose={onClose}
        onSave={noop}
      />
    );
    // Find the button that only contains an SVG (not "Edit" text)
    const buttons = screen.getAllByRole("button");
    const xButton = buttons.find((btn) => btn.textContent === "");
    fireEvent.click(xButton!);
    expect(onClose).toHaveBeenCalled();
  });
});

// ─── Edit mode ────────────────────────────────────────────────────────────────

describe("SetDetailSheet — edit mode", () => {
  it("enters edit mode when Edit button is clicked", () => {
    render(
      <SetDetailSheet
        set={baseSet}
        exercise={baseExercise}
        unit="kg"
        onClose={vi.fn()}
        onSave={noop}
      />
    );
    fireEvent.click(screen.getByText("Edit"));
    // In edit mode, the spinbutton inputs should appear
    const inputs = screen.getAllByRole("spinbutton");
    expect(inputs.length).toBeGreaterThanOrEqual(2);
  });

  it("weight input shows display value 100 in kg mode", () => {
    render(
      <SetDetailSheet
        set={baseSet}
        exercise={baseExercise}
        unit="kg"
        onClose={vi.fn()}
        onSave={noop}
      />
    );
    const { weightInput } = enterEditMode();
    expect(weightInput.value).toBe("100");
  });

  it("weight input shows lbs conversion when unit=lbs", () => {
    render(
      <SetDetailSheet
        set={baseSet}
        exercise={baseExercise}
        unit="lbs"
        onClose={vi.fn()}
        onSave={noop}
      />
    );
    const { weightInput } = enterEditMode();
    // toDisplay(100, "lbs") = Math.round(100 * 2.20462 * 4) / 4 = 882/4 = 220.5
    expect(weightInput.value).toBe("220.5");
  });

  it("label says 'Each hand (kg)' when weightPerSide=true", () => {
    render(
      <SetDetailSheet
        set={baseSet}
        exercise={{ ...baseExercise, weightPerSide: true }}
        unit="kg"
        onClose={vi.fn()}
        onSave={noop}
      />
    );
    fireEvent.click(screen.getByText("Edit"));
    expect(screen.getByText("Each hand (kg)")).toBeInTheDocument();
  });

  it("shows total weight line when weightPerSide=true and weight is entered", () => {
    render(
      <SetDetailSheet
        set={baseSet}
        exercise={{ ...baseExercise, weightPerSide: true }}
        unit="kg"
        onClose={vi.fn()}
        onSave={noop}
      />
    );
    fireEvent.click(screen.getByText("Edit"));
    // Initial weight is 100, so "= 200 kg total" should be shown
    expect(screen.getByText(/= 200 kg total/)).toBeInTheDocument();
  });

  it("Cancel returns to read-only view with original values", () => {
    const { container } = render(
      <SetDetailSheet
        set={baseSet}
        exercise={baseExercise}
        unit="kg"
        onClose={vi.fn()}
        onSave={noop}
      />
    );
    fireEvent.click(screen.getByText("Edit"));
    // Change the weight
    const inputs = screen.getAllByRole("spinbutton") as HTMLInputElement[];
    fireEvent.change(inputs[0], { target: { value: "150" } });
    // Click Cancel
    fireEvent.click(screen.getByText("Cancel"));
    // Should be back to read-only — no spinbuttons
    expect(screen.queryAllByRole("spinbutton")).toHaveLength(0);
    // Weight should show original value in first grid tile
    const tiles = getGridTiles(container);
    expect(within(tiles[0] as HTMLElement).getByText("100")).toBeInTheDocument();
  });

  it("Cancel resets weight input to original value on re-entering edit mode", () => {
    render(
      <SetDetailSheet
        set={baseSet}
        exercise={baseExercise}
        unit="kg"
        onClose={vi.fn()}
        onSave={noop}
      />
    );
    fireEvent.click(screen.getByText("Edit"));
    const inputs = screen.getAllByRole("spinbutton") as HTMLInputElement[];
    fireEvent.change(inputs[0], { target: { value: "150" } });
    fireEvent.click(screen.getByText("Cancel"));
    // Enter edit mode again
    fireEvent.click(screen.getByText("Edit"));
    const inputsAgain = screen.getAllByRole("spinbutton") as HTMLInputElement[];
    expect(inputsAgain[0].value).toBe("100");
  });

  it("does not call onSave when reps is 0", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <SetDetailSheet
        set={baseSet}
        exercise={baseExercise}
        unit="kg"
        onClose={vi.fn()}
        onSave={onSave}
      />
    );
    const { repsInput } = enterEditMode();
    fireEvent.change(repsInput, { target: { value: "0" } });
    fireEvent.click(screen.getByText("Save"));
    expect(onSave).not.toHaveBeenCalled();
  });

  it("calls onSave with correct kg values", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <SetDetailSheet
        set={baseSet}
        exercise={baseExercise}
        unit="kg"
        onClose={vi.fn()}
        onSave={onSave}
      />
    );
    fireEvent.click(screen.getByText("Edit"));
    // Weight is 100, reps is 8, rpe starts at "8" (from set.rpe=8)
    fireEvent.click(screen.getByText("Save"));
    await vi.waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave).toHaveBeenCalledWith("set-1", 100, 8, 8);
  });

  it("calls onSave with kg conversion from lbs", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <SetDetailSheet
        set={baseSet}
        exercise={baseExercise}
        unit="lbs"
        onClose={vi.fn()}
        onSave={onSave}
      />
    );
    fireEvent.click(screen.getByText("Edit"));
    const inputs = screen.getAllByRole("spinbutton") as HTMLInputElement[];
    fireEvent.change(inputs[0], { target: { value: "220" } });
    // Clear RPE by clicking the currently selected RPE button (8 is selected initially)
    const rpeButtons = screen.getAllByRole("button").filter(
      (btn) => btn.className.includes("bg-primary") && btn.textContent === "8"
    );
    if (rpeButtons.length > 0) fireEvent.click(rpeButtons[0]);

    fireEvent.click(screen.getByText("Save"));
    await vi.waitFor(() => expect(onSave).toHaveBeenCalled());
    const [, weightArg] = onSave.mock.calls[0] as [string, number, number, null];
    // toKg(220, "lbs") = 220 / 2.20462 ≈ 99.79
    expect(weightArg).toBeCloseTo(220 / 2.20462, 1);
  });

  it("RPE button '9' toggles on when clicked", () => {
    render(
      <SetDetailSheet
        set={baseSet}
        exercise={baseExercise}
        unit="kg"
        onClose={vi.fn()}
        onSave={noop}
      />
    );
    fireEvent.click(screen.getByText("Edit"));
    // Find the RPE button with text "9" (exact text match)
    const buttons = screen.getAllByRole("button");
    const rpe9 = buttons.find((btn) => btn.textContent === "9");
    expect(rpe9).toBeDefined();
    fireEvent.click(rpe9!);
    expect(rpe9!.className).toContain("bg-primary");
  });

  it("RPE button toggles off when clicked twice", () => {
    render(
      <SetDetailSheet
        set={baseSet}
        exercise={baseExercise}
        unit="kg"
        onClose={vi.fn()}
        onSave={noop}
      />
    );
    fireEvent.click(screen.getByText("Edit"));
    const buttons = screen.getAllByRole("button");
    const rpe9 = buttons.find((btn) => btn.textContent === "9");
    fireEvent.click(rpe9!);
    fireEvent.click(rpe9!);
    expect(rpe9!.className).not.toContain("bg-primary");
  });
});
