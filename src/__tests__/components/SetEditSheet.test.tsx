import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import SetEditSheet from "@/components/SetEditSheet";
import type { Exercise, SetLog } from "@/lib/types";

const baseExercise: Exercise = {
  id: "ex-1",
  name: "Bench Press",
  alternates: [],
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

// Helper: the weight and reps inputs (the sheet opens straight in edit mode)
function getInputs() {
  // The weight input is the first number input, reps is the second
  const inputs = screen.getAllByRole("spinbutton") as HTMLInputElement[];
  return { weightInput: inputs[0], repsInput: inputs[1] };
}

describe("SetEditSheet — opening and closing", () => {
  it("opens straight in edit mode, with no read-only step or Edit button", () => {
    render(<SetEditSheet set={baseSet} exercise={baseExercise} unit="kg" onClose={vi.fn()} onSave={noop} />);
    expect(screen.getAllByRole("spinbutton")).toHaveLength(2);
    expect(screen.queryByText("Edit")).toBeNull();
  });

  it("calls onClose when the backdrop is clicked", () => {
    const onClose = vi.fn();
    const { container } = render(<SetEditSheet set={baseSet} exercise={baseExercise} unit="kg" onClose={onClose} onSave={noop} />);
    fireEvent.click(container.firstElementChild!);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when the X button is clicked", () => {
    const onClose = vi.fn();
    render(<SetEditSheet set={baseSet} exercise={baseExercise} unit="kg" onClose={onClose} onSave={noop} />);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("Cancel closes without saving", () => {
    const onClose = vi.fn();
    const onSave = vi.fn();
    render(<SetEditSheet set={baseSet} exercise={baseExercise} unit="kg" onClose={onClose} onSave={onSave} />);
    fireEvent.change(getInputs().weightInput, { target: { value: "150" } });
    fireEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalledOnce();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("closes once the change is saved", async () => {
    const onClose = vi.fn();
    render(<SetEditSheet set={baseSet} exercise={baseExercise} unit="kg" onClose={onClose} onSave={noop} />);
    await act(async () => { fireEvent.click(screen.getByText("Save")); });
    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe("SetEditSheet — editing", () => {
  it("weight input shows display value 100 in kg mode", () => {
    render(
      <SetEditSheet
        set={baseSet}
        exercise={baseExercise}
        unit="kg"
        onClose={vi.fn()}
        onSave={noop}
      />
    );
    const { weightInput } = getInputs();
    expect(weightInput.value).toBe("100");
  });

  it("weight input shows lbs conversion when unit=lbs", () => {
    render(
      <SetEditSheet
        set={baseSet}
        exercise={baseExercise}
        unit="lbs"
        onClose={vi.fn()}
        onSave={noop}
      />
    );
    const { weightInput } = getInputs();
    // toDisplay(100, "lbs") = Math.round(100 * 2.20462 * 4) / 4 = 882/4 = 220.5
    expect(weightInput.value).toBe("220.5");
  });

  it("label says 'Each hand (kg)' when weightPerSide=true", () => {
    render(
      <SetEditSheet
        set={baseSet}
        exercise={{ ...baseExercise, weightPerSide: true }}
        unit="kg"
        onClose={vi.fn()}
        onSave={noop}
      />
    );
    expect(screen.getByText("Each hand (kg)")).toBeInTheDocument();
  });

  it("shows total weight line when weightPerSide=true and weight is entered", () => {
    render(
      <SetEditSheet
        set={baseSet}
        exercise={{ ...baseExercise, weightPerSide: true }}
        unit="kg"
        onClose={vi.fn()}
        onSave={noop}
      />
    );
    // Initial weight is 100, so "= 200 kg total" should be shown
    expect(screen.getByText(/= 200 kg total/)).toBeInTheDocument();
  });

  it("does not call onSave when reps is 0", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <SetEditSheet
        set={baseSet}
        exercise={baseExercise}
        unit="kg"
        onClose={vi.fn()}
        onSave={onSave}
      />
    );
    const { repsInput } = getInputs();
    fireEvent.change(repsInput, { target: { value: "0" } });
    fireEvent.click(screen.getByText("Save"));
    expect(onSave).not.toHaveBeenCalled();
  });

  it("calls onSave with correct kg values", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <SetEditSheet
        set={baseSet}
        exercise={baseExercise}
        unit="kg"
        onClose={vi.fn()}
        onSave={onSave}
      />
    );
    // Weight is 100, reps is 8, rpe starts at "8" (from set.rpe=8)
    await act(async () => {
      fireEvent.click(screen.getByText("Save"));
      await vi.waitFor(() => expect(onSave).toHaveBeenCalled());
    });
    expect(onSave).toHaveBeenCalledWith("set-1", 100, 8, 8);
  });

  it("calls onSave with kg conversion from lbs", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <SetEditSheet
        set={baseSet}
        exercise={baseExercise}
        unit="lbs"
        onClose={vi.fn()}
        onSave={onSave}
      />
    );
    const inputs = screen.getAllByRole("spinbutton") as HTMLInputElement[];
    fireEvent.change(inputs[0], { target: { value: "220" } });
    // Clear RPE by clicking the currently selected RPE button (8 is selected initially)
    const rpeButtons = screen.getAllByRole("button").filter(
      (btn) => btn.className.includes("bg-primary") && btn.textContent === "8"
    );
    if (rpeButtons.length > 0) fireEvent.click(rpeButtons[0]);

    await act(async () => {
      fireEvent.click(screen.getByText("Save"));
      await vi.waitFor(() => expect(onSave).toHaveBeenCalled());
    });
    const [, weightArg] = onSave.mock.calls[0] as [string, number, number, null];
    // toKg(220, "lbs") = 220 / 2.20462 ≈ 99.79
    expect(weightArg).toBeCloseTo(220 / 2.20462, 1);
  });

  it("RPE button '9' toggles on when clicked", () => {
    render(
      <SetEditSheet
        set={baseSet}
        exercise={baseExercise}
        unit="kg"
        onClose={vi.fn()}
        onSave={noop}
      />
    );
    // Find the RPE button with text "9" (exact text match)
    const buttons = screen.getAllByRole("button");
    const rpe9 = buttons.find((btn) => btn.textContent === "9");
    expect(rpe9).toBeDefined();
    fireEvent.click(rpe9!);
    expect(rpe9!.className).toContain("bg-primary");
  });

  it("RPE button toggles off when clicked twice", () => {
    render(
      <SetEditSheet
        set={baseSet}
        exercise={baseExercise}
        unit="kg"
        onClose={vi.fn()}
        onSave={noop}
      />
    );
    const buttons = screen.getAllByRole("button");
    const rpe9 = buttons.find((btn) => btn.textContent === "9");
    fireEvent.click(rpe9!);
    fireEvent.click(rpe9!);
    expect(rpe9!.className).not.toContain("bg-primary");
  });
});

describe("SetEditSheet — save failure", () => {
  it("stays open with an error when saving fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const onCloseOnFail = vi.fn();
    render(
      <SetEditSheet
        set={baseSet}
        exercise={baseExercise}
        unit="kg"
        onClose={onCloseOnFail}
        onSave={vi.fn().mockRejectedValue(new Error("offline"))}
      />
    );
    getInputs();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /Save/ })); });

    expect(onCloseOnFail).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't save your changes");
    expect(screen.getAllByRole("spinbutton").length).toBeGreaterThan(0); // still editing
    expect(screen.getByRole("button", { name: /Save/ })).not.toBeDisabled();
  });
});
