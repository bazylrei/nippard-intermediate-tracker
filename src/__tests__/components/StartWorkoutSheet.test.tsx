import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import StartWorkoutSheet from "@/components/program/StartWorkoutSheet";
import type { WorkoutDay } from "@/lib/types";

const day = { dayType: "push", exercises: [{ id: "bench", name: "Bench Press" }, { id: "ohp", name: "Overhead Press" }] } as unknown as WorkoutDay;

function renderSheet(unfinished: { label: string; setCount: number } | null, onStart = vi.fn().mockResolvedValue(undefined)) {
  const onClose = vi.fn();
  render(<StartWorkoutSheet week={3} day={day} unfinished={unfinished} onStart={onStart} onClose={onClose} />);
  return { onStart, onClose };
}

describe("StartWorkoutSheet", () => {
  it("shows the day and its exercises, and starts it", async () => {
    const { onStart } = renderSheet(null);
    expect(screen.getByText("Week 3")).toBeInTheDocument();
    expect(screen.getByText("Push — Hypertrophy")).toBeInTheDocument();
    expect(screen.getByText("Overhead Press")).toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Start workout" })); });
    expect(onStart).toHaveBeenCalledWith(null);
  });

  it("asks whether to save or discard an unfinished workout with sets logged", async () => {
    const { onStart } = renderSheet({ label: "Upper — Strength", setCount: 4 });
    expect(screen.getByText(/unfinished, with 4 sets logged/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Start workout" })).toBeNull();

    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Save it & start" })); });
    expect(onStart).toHaveBeenLastCalledWith("save");
  });

  it("can discard the unfinished workout instead", async () => {
    const { onStart } = renderSheet({ label: "Upper — Strength", setCount: 1 });
    expect(screen.getByText(/with 1 set logged/)).toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Discard it & start" })); });
    expect(onStart).toHaveBeenCalledWith("discard");
  });

  it("just discards an unfinished workout with nothing logged, saying so", async () => {
    const { onStart } = renderSheet({ label: "Upper — Strength", setCount: 0 });
    expect(screen.getByText(/no sets logged, so it will be discarded/)).toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Start workout" })); });
    expect(onStart).toHaveBeenCalledWith("discard");
  });

  it("stays open with an error when starting fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { onClose } = renderSheet(null, vi.fn().mockRejectedValue(new Error("offline")));
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Start workout" })); });
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't start the workout");
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Start workout" })).toBeEnabled();
  });

  it("closes from the close button", () => {
    const { onClose, onStart } = renderSheet(null);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalled();
    expect(onStart).not.toHaveBeenCalled();
  });
});
