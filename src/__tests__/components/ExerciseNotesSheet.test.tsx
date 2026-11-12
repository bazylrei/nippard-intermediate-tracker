import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ExerciseNotesSheet from "@/components/ExerciseNotesSheet";
import type { Exercise } from "@/lib/types";

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

const noFormNoteExercise: Exercise = { ...baseExercise, formNote: "" };

describe("ExerciseNotesSheet", () => {
  it("shows exercise name", () => {
    render(
      <ExerciseNotesSheet
        exercise={baseExercise}
        existingNote=""
        onClose={vi.fn()}
        onSave={vi.fn().mockResolvedValue(undefined)}
      />
    );
    expect(screen.getByText("Bench Press")).toBeInTheDocument();
  });

  it("shows formNote content", () => {
    render(
      <ExerciseNotesSheet
        exercise={baseExercise}
        existingNote=""
        onClose={vi.fn()}
        onSave={vi.fn().mockResolvedValue(undefined)}
      />
    );
    expect(screen.getByText("Keep shoulder blades retracted.")).toBeInTheDocument();
  });

  it("does not render formNote section when formNote is empty", () => {
    render(
      <ExerciseNotesSheet
        exercise={noFormNoteExercise}
        existingNote=""
        onClose={vi.fn()}
        onSave={vi.fn().mockResolvedValue(undefined)}
      />
    );
    expect(screen.queryByText(/Coach's cue/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Keep shoulder blades retracted.")).not.toBeInTheDocument();
  });

  it("textarea is initialized with existingNote", () => {
    render(
      <ExerciseNotesSheet
        exercise={baseExercise}
        existingNote="Rack hole 7, grip inside rings"
        onClose={vi.fn()}
        onSave={vi.fn().mockResolvedValue(undefined)}
      />
    );
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(textarea.value).toBe("Rack hole 7, grip inside rings");
  });

  it("textarea is empty when existingNote is empty string", () => {
    render(
      <ExerciseNotesSheet
        exercise={baseExercise}
        existingNote=""
        onClose={vi.fn()}
        onSave={vi.fn().mockResolvedValue(undefined)}
      />
    );
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(textarea.value).toBe("");
  });

  it("typing in textarea updates its value", async () => {
    const user = userEvent.setup();
    render(
      <ExerciseNotesSheet
        exercise={baseExercise}
        existingNote=""
        onClose={vi.fn()}
        onSave={vi.fn().mockResolvedValue(undefined)}
      />
    );
    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "new note");
    expect((textarea as HTMLTextAreaElement).value).toBe("new note");
  });

  it("Cancel button calls onClose", () => {
    const onClose = vi.fn();
    render(
      <ExerciseNotesSheet
        exercise={baseExercise}
        existingNote=""
        onClose={onClose}
        onSave={vi.fn().mockResolvedValue(undefined)}
      />
    );
    fireEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("Save button calls onSave with textarea value", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(
      <ExerciseNotesSheet
        exercise={baseExercise}
        existingNote="existing note"
        onClose={onClose}
        onSave={onSave}
      />
    );
    fireEvent.click(screen.getByText("Save"));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith("existing note"));
  });

  it("backdrop click calls onClose", () => {
    const onClose = vi.fn();
    const { container } = render(
      <ExerciseNotesSheet
        exercise={baseExercise}
        existingNote=""
        onClose={onClose}
        onSave={vi.fn().mockResolvedValue(undefined)}
      />
    );
    const backdrop = container.firstChild as HTMLElement;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });

  it("Save button shows 'Saving…' while async onSave is pending", async () => {
    let resolve!: () => void;
    const onSave = vi.fn().mockReturnValue(
      new Promise<void>((res) => { resolve = res; })
    );
    render(
      <ExerciseNotesSheet
        exercise={baseExercise}
        existingNote=""
        onClose={vi.fn()}
        onSave={onSave}
      />
    );
    fireEvent.click(screen.getByText("Save"));
    // While pending, should show "Saving…"
    expect(screen.getByText("Saving…")).toBeInTheDocument();
    // Resolve the promise
    resolve();
    await waitFor(() => expect(screen.queryByText("Saving…")).not.toBeInTheDocument());
  });
});

describe("ExerciseNotesSheet — save failure", () => {
  it("stays open with an error and re-enables Save when saving fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const onClose = vi.fn();
    render(
      <ExerciseNotesSheet
        exercise={baseExercise}
        existingNote="rack 7"
        onClose={onClose}
        onSave={vi.fn().mockRejectedValue(new Error("offline"))}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /Save/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't save your note");
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /Save/ })).not.toBeDisabled();
  });
});
