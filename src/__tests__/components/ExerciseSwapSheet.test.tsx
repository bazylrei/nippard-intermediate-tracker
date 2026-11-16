import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import type { Exercise } from "@/lib/types";
import ExerciseSwapSheet from "@/components/workout/ExerciseSwapSheet";

const option = (id: string, name: string) => ({ id, name, alternates: [] }) as unknown as Exercise;
const options = [option("bench", "Bench Press"), option("db-bench", "DB Bench Press"), option("machine", "Machine Press")];

function renderSheet(over: Partial<Parameters<typeof ExerciseSwapSheet>[0]> = {}) {
  const onChoose = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();
  render(<ExerciseSwapSheet options={options} currentId="bench" defaultId="bench" onChoose={onChoose} onClose={onClose} {...over} />);
  return { onChoose, onClose };
}

const radio = (name: RegExp | string) => screen.getByRole("radio", { name });
const confirm = (name: RegExp | string) => screen.getByRole("button", { name });
const press = async (el: HTMLElement) => { await act(async () => { fireEvent.click(el); }); };

describe("ExerciseSwapSheet", () => {
  it("offers the exercise and both alternates, with the current one selected and the default tagged", () => {
    renderSheet({ currentId: "db-bench", defaultId: "machine" });
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(radio("DB Bench Press")).toHaveAttribute("aria-checked", "true");
    expect(radio("Bench Press")).toHaveAttribute("aria-checked", "false");
    expect(radio(/Machine Press.*Your default/)).toBeInTheDocument();
  });

  it("applies a choice to this workout only, by default", async () => {
    const { onChoose, onClose } = renderSheet();
    fireEvent.click(radio("DB Bench Press"));
    expect(screen.getByText("Applies to this workout only.")).toBeInTheDocument();

    await press(confirm("Use DB Bench Press"));

    expect(onChoose).toHaveBeenCalledExactlyOnceWith("db-bench", false);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("makes the choice the default for future workouts when the box is ticked", async () => {
    const { onChoose } = renderSheet();
    fireEvent.click(radio("DB Bench Press"));
    fireEvent.click(screen.getByRole("checkbox", { name: "Make this my default for future workouts" }));
    expect(screen.getByText("Future workouts will start with this exercise.")).toBeInTheDocument();

    await press(confirm("Use DB Bench Press"));

    expect(onChoose).toHaveBeenCalledExactlyOnceWith("db-bench", true);
  });

  it("doesn't offer to make the current default the default again", () => {
    renderSheet({ currentId: "bench", defaultId: "bench" });
    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  it("starts the checkbox unticked again whenever a different exercise is picked", () => {
    renderSheet();
    fireEvent.click(radio("DB Bench Press"));
    fireEvent.click(screen.getByRole("checkbox"));
    expect(screen.getByRole("checkbox")).toBeChecked();

    fireEvent.click(radio("Machine Press"));
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });

  it("lets today's workout go back to the main exercise even when another is the default", async () => {
    const { onChoose } = renderSheet({ currentId: "db-bench", defaultId: "db-bench" });
    fireEvent.click(radio("Bench Press"));
    await press(confirm("Use Bench Press"));
    expect(onChoose).toHaveBeenCalledExactlyOnceWith("bench", false);
  });

  it("has nothing to confirm until something changes", () => {
    renderSheet();
    expect(confirm("Use Bench Press")).toBeDisabled();
    fireEvent.click(radio("Machine Press"));
    expect(confirm("Use Machine Press")).toBeEnabled();
  });

  it("stays open with an error when saving fails, so the choice can be retried", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { onClose } = renderSheet({ onChoose: vi.fn().mockRejectedValue(new Error("offline")) });
    fireEvent.click(radio("DB Bench Press"));

    await press(confirm("Use DB Bench Press"));

    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't switch exercise");
    expect(onClose).not.toHaveBeenCalled();
    expect(confirm("Use DB Bench Press")).toBeEnabled();
  });

  it("closes from Cancel without choosing anything", () => {
    const { onChoose, onClose } = renderSheet();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(onChoose).not.toHaveBeenCalled();
  });
});
