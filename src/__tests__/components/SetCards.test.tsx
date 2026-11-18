import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { SetLog } from "@/lib/types";
import { LoggedSetCard, UpcomingSetCard } from "@/components/workout/SetCards";

const set = { id: "s1", exerciseId: "bench", setIndex: 0, weight: 100, reps: 8, rpe: 8.5 } as SetLog;

describe("LoggedSetCard", () => {
  it("shows what was logged, converted to the user's unit", () => {
    render(<LoggedSetCard set={set} setNumber={1} unit="lbs" weightPerSide={false} onEdit={() => {}} />);
    expect(screen.getByText("Set 1")).toBeInTheDocument();
    expect(screen.getByText(/220\.5lbs × 8/)).toBeInTheDocument();
    expect(screen.getByText("@ RPE 8.5")).toBeInTheDocument();
  });

  it("marks per-side weights", () => {
    render(<LoggedSetCard set={set} setNumber={1} unit="kg" weightPerSide onEdit={() => {}} />);
    expect(screen.getByText("2× 100kg × 8")).toBeInTheDocument();
  });

  it("opens the set for editing", () => {
    const onEdit = vi.fn();
    render(<LoggedSetCard set={set} setNumber={1} unit="kg" weightPerSide={false} onEdit={onEdit} />);
    fireEvent.click(screen.getByRole("button", { name: /Edit set/ }));
    expect(onEdit).toHaveBeenCalledOnce();
  });
});

describe("UpcomingSetCard", () => {
  it("previews the rep range and target RPE", () => {
    render(<UpcomingSetCard setNumber={3} repRange={[6, 10]} targetRpe={[7, 8]} />);
    expect(screen.getByText("Set 3")).toBeInTheDocument();
    expect(screen.getByText("6–10 reps · RPE 7–8")).toBeInTheDocument();
  });

  it("omits the RPE when the set has no target", () => {
    render(<UpcomingSetCard setNumber={3} repRange={[6, 10]} />);
    expect(screen.getByText("6–10 reps")).toBeInTheDocument();
  });
});
