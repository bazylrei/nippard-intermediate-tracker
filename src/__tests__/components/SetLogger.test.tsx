import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { Exercise, SetLog } from "@/lib/types";

vi.mock("@/context/ProgramContext", () => ({ useProgramContext: () => ({ failureTechniques: {} }) }));

import SetLogger from "@/components/SetLogger";

const dumbbellPress = {
  id: "db-press", name: "DB Press", repRange: [8, 12], earlySetRpe: [7, 8], lastSetTarget: "failure",
  isBodyweight: false, weightPerSide: true,
} as unknown as Exercise;

function renderLogger(onLog = vi.fn()) {
  render(<SetLogger exercise={dumbbellPress} setIndex={0} isLastSet={false} previousSets={[]} unit="kg" onLog={onLog} />);
  return onLog;
}

describe("SetLogger — per-side weights", () => {
  it("takes the weight for each hand and shows the total", () => {
    renderLogger();
    expect(screen.getByText("2×")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("spinbutton", { name: "Each hand (kg)" }), { target: { value: "22.5" } });

    expect(screen.getByText("= 45 kg total")).toBeInTheDocument();
  });

  it("logs the per-hand weight, not the doubled total", () => {
    const onLog = renderLogger();
    fireEvent.change(screen.getByRole("spinbutton", { name: "Each hand (kg)" }), { target: { value: "22.5" } });
    fireEvent.change(screen.getAllByRole("spinbutton")[1], { target: { value: "10" } });

    fireEvent.click(screen.getByRole("button", { name: /Log Set/ }));

    expect(onLog).toHaveBeenCalledWith(22.5, 10, null, null);
  });
});

describe("SetLogger — add-weight tip after maxing the rep range", () => {
  const barbellRow = { ...dumbbellPress, id: "row", weightPerSide: false } as Exercise;
  const lastTime = (reps: number) => [{ id: "p", exerciseId: "row", setIndex: 0, weight: 80, reps, rpe: null }] as SetLog[];

  function renderWith(previousSets: SetLog[], onLog = vi.fn()) {
    render(<SetLogger exercise={barbellRow} setIndex={0} isLastSet={false} previousSets={previousSets} unit="kg" onLog={onLog} />);
    return onLog;
  }

  it("suggests adding weight when last time hit the top of the range", () => {
    renderWith(lastTime(12)); // range 8–12
    expect(screen.getByRole("note")).toHaveTextContent("You hit 12 reps last time — the top of your range. Time to add weight: try 82.5kg.");
  });

  it("shows no tip while there are still reps to add", () => {
    renderWith(lastTime(11));
    expect(screen.queryByRole("note")).toBeNull();
  });

  it("fills in the suggested weight with one tap, and logs it", () => {
    const onLog = renderWith(lastTime(12));
    const weight = screen.getAllByRole("spinbutton")[0];
    expect(weight).toHaveValue(80); // pre-filled from last time

    fireEvent.click(screen.getByRole("button", { name: "Use 82.5kg" }));
    expect(weight).toHaveValue(82.5);
    expect(screen.getByRole("button", { name: "Set" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /Log Set/ }));
    expect(onLog).toHaveBeenCalledWith(82.5, 12, null, null);
  });
});

