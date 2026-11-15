import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { Exercise } from "@/lib/types";

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
