import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import WarmupChecklist from "@/components/WarmupChecklist";

const twoSteps = [
  "Step 1: ~50% 1RM × 10 reps",
  "Step 2: ~75% 1RM × 5 reps",
];

describe("WarmupChecklist", () => {
  it("renders all step texts", () => {
    render(
      <WarmupChecklist
        steps={twoSteps}
        onComplete={vi.fn()}
        onSkip={vi.fn()}
        unit="kg"
      />
    );
    expect(screen.getByText(twoSteps[0])).toBeInTheDocument();
    expect(screen.getByText(twoSteps[1])).toBeInTheDocument();
  });

  it("shows hint text initially and no Start Working Sets button", () => {
    render(
      <WarmupChecklist
        steps={twoSteps}
        onComplete={vi.fn()}
        onSkip={vi.fn()}
        unit="kg"
      />
    );
    expect(screen.getByText("Tap each step when done to continue")).toBeInTheDocument();
    expect(screen.queryByText(/Start Working Sets/)).not.toBeInTheDocument();
  });

  it("still shows hint after clicking only one of two steps", () => {
    render(
      <WarmupChecklist
        steps={twoSteps}
        onComplete={vi.fn()}
        onSkip={vi.fn()}
        unit="kg"
      />
    );
    fireEvent.click(screen.getByText(twoSteps[0]));
    expect(screen.getByText("Tap each step when done to continue")).toBeInTheDocument();
    expect(screen.queryByText(/Start Working Sets/)).not.toBeInTheDocument();
  });

  it("shows Start Working Sets and hides hint after all steps checked", () => {
    render(
      <WarmupChecklist
        steps={twoSteps}
        onComplete={vi.fn()}
        onSkip={vi.fn()}
        unit="kg"
      />
    );
    fireEvent.click(screen.getByText(twoSteps[0]));
    fireEvent.click(screen.getByText(twoSteps[1]));
    expect(screen.getByText(/Start Working Sets/)).toBeInTheDocument();
    expect(screen.queryByText("Tap each step when done to continue")).not.toBeInTheDocument();
  });

  it("calls onSkip when Skip button is clicked", () => {
    const onSkip = vi.fn();
    render(
      <WarmupChecklist
        steps={twoSteps}
        onComplete={vi.fn()}
        onSkip={onSkip}
        unit="kg"
      />
    );
    fireEvent.click(screen.getByText(/Skip/));
    expect(onSkip).toHaveBeenCalledOnce();
  });

  it("calls onComplete when Start Working Sets is clicked", () => {
    const onComplete = vi.fn();
    render(
      <WarmupChecklist
        steps={twoSteps}
        onComplete={onComplete}
        onSkip={vi.fn()}
        unit="kg"
      />
    );
    fireEvent.click(screen.getByText(twoSteps[0]));
    fireEvent.click(screen.getByText(twoSteps[1]));
    fireEvent.click(screen.getByText(/Start Working Sets/));
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it("renders weight suggestion in kg when prevWorkingWeightKg=100 and step has ~75%", () => {
    render(
      <WarmupChecklist
        steps={["Set 1: ~75% 1RM × 10 reps"]}
        onComplete={vi.fn()}
        onSkip={vi.fn()}
        prevWorkingWeightKg={100}
        unit="kg"
      />
    );
    // 100 * 0.75 = 75kg → Math.round(75 / 2.5) * 2.5 = 75
    expect(screen.getByText("~75 kg")).toBeInTheDocument();
  });

  it("renders weight suggestion in lbs when prevWorkingWeightKg=100 and step has ~75%", () => {
    render(
      <WarmupChecklist
        steps={["Set 1: ~75% 1RM × 10 reps"]}
        onComplete={vi.fn()}
        onSkip={vi.fn()}
        prevWorkingWeightKg={100}
        unit="lbs"
      />
    );
    // 100 * 0.75 = 75kg; 75 * 2.20462 = 165.3465; Math.round(165.3465 / 2.5) * 2.5 = 165
    expect(screen.getByText("~165 lbs")).toBeInTheDocument();
  });

  it("renders nothing for empty steps array", () => {
    const { container } = render(
      <WarmupChecklist
        steps={[]}
        onComplete={vi.fn()}
        onSkip={vi.fn()}
        unit="kg"
      />
    );
    expect(container.firstChild).toBeNull();
  });
});
