import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import WarmupSlide from "@/components/workout/WarmupSlide";

const steps = ["~50% × 6–10 reps", "~70% × 4–6 reps"];

describe("WarmupSlide", () => {
  it("is the interactive checklist while warming up", () => {
    const onComplete = vi.fn();
    render(<WarmupSlide steps={steps} active onComplete={onComplete} prevWorkingWeightKg={100} unit="kg" />);

    expect(screen.getByText("~50 kg")).toBeInTheDocument(); // weight suggestion
    fireEvent.click(screen.getByText(/Skip/));
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it("is a read-only recap once the warm-up is done", () => {
    render(<WarmupSlide steps={steps} active={false} onComplete={vi.fn()} unit="kg" />);

    expect(screen.getByText("Done")).toBeInTheDocument();
    expect(screen.getByText(steps[0])).toBeInTheDocument();
    expect(screen.getByText(steps[1])).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
