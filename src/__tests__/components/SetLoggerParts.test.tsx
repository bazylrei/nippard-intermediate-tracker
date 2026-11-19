import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SetLoggerHeader from "@/components/workout/SetLoggerHeader";
import WeightField from "@/components/workout/WeightField";
import RpePicker from "@/components/workout/RpePicker";
import FailureToggle from "@/components/workout/FailureToggle";

describe("SetLoggerHeader", () => {
  it("numbers the set from one and shows the RPE to aim for", () => {
    render(<SetLoggerHeader setIndex={2} isLastSet={false} onShowTechnique={vi.fn()} targetRpe={[7, 8]} />);
    expect(screen.getByText("Set 3")).toBeInTheDocument();
    expect(screen.getByText("RPE 7–8")).toBeInTheDocument();
  });

  it("offers the failure technique only on the last set", () => {
    const onShow = vi.fn();
    const { rerender } = render(<SetLoggerHeader setIndex={0} isLastSet={false} techniqueLabel="Myo-Reps" onShowTechnique={onShow} />);
    expect(screen.queryByText("Myo-Reps")).toBeNull();

    rerender(<SetLoggerHeader setIndex={3} isLastSet techniqueLabel="Myo-Reps" onShowTechnique={onShow} />);
    expect(screen.getByText("Myo-Reps")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button"));
    expect(onShow).toHaveBeenCalledTimes(1);
  });

  it("has no RPE pill without a target", () => {
    render(<SetLoggerHeader setIndex={0} isLastSet={false} onShowTechnique={vi.fn()} />);
    expect(screen.queryByText(/^RPE/)).toBeNull();
  });
});

describe("WeightField", () => {
  const field = (over: Partial<React.ComponentProps<typeof WeightField>> = {}) => (
    <WeightField unit="kg" weightPerSide={false} isBodyweight={false} value="" onChange={() => {}} {...over} />
  );

  it("labels the box by what is typed in it", () => {
    const { rerender } = render(field());
    expect(screen.getByText("Weight (kg)")).toBeInTheDocument();
    rerender(field({ isBodyweight: true, unit: "lbs" }));
    expect(screen.getByText("Added (lbs)")).toBeInTheDocument();
    rerender(field({ weightPerSide: true }));
    expect(screen.getByText("Each hand (kg)")).toBeInTheDocument();
  });

  it("reports what is typed", () => {
    const onChange = vi.fn();
    render(field({ onChange }));
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "82.5" } });
    expect(onChange).toHaveBeenCalledWith("82.5");
  });

  it("shows the total for a per-side weight once a positive number is typed", () => {
    const { rerender } = render(field({ weightPerSide: true, value: "" }));
    expect(screen.queryByText(/total/)).toBeNull();
    rerender(field({ weightPerSide: true, value: "0" }));
    expect(screen.queryByText(/total/)).toBeNull();
    rerender(field({ weightPerSide: true, value: "16" }));
    expect(screen.getByText("= 32 kg total")).toBeInTheDocument();
  });

  it("shows no total for a plain weight", () => {
    render(field({ value: "100" }));
    expect(screen.queryByText(/total/)).toBeNull();
  });
});

describe("RpePicker", () => {
  it("offers 6 to 10 in half steps", () => {
    render(<RpePicker value="" onChange={() => {}} />);
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual(["6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10"]);
  });

  it("chooses a value, and clears it when tapped again", () => {
    const onChange = vi.fn();
    const { rerender } = render(<RpePicker value="" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "8.5" }));
    expect(onChange).toHaveBeenLastCalledWith("8.5");

    rerender(<RpePicker value="8.5" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "8.5" }));
    expect(onChange).toHaveBeenLastCalledWith("");
  });
});

describe("FailureToggle", () => {
  it("answers yes or no", () => {
    const onChange = vi.fn();
    render(<FailureToggle value={null} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Yes" }));
    expect(onChange).toHaveBeenLastCalledWith(true);
    fireEvent.click(screen.getByRole("button", { name: "No" }));
    expect(onChange).toHaveBeenLastCalledWith(false);
  });

  it("highlights only the answer given", () => {
    const { rerender } = render(<FailureToggle value={null} onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Yes" })).not.toHaveClass("bg-accent");
    rerender(<FailureToggle value onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Yes" })).toHaveClass("bg-accent");
    expect(screen.getByRole("button", { name: "No" })).toHaveClass("chip-idle");
    rerender(<FailureToggle value={false} onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Yes" })).toHaveClass("chip-idle");
    expect(screen.getByRole("button", { name: "No" })).toHaveClass("text-fg");
  });
});
