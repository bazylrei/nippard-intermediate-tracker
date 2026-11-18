import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { UpcomingSetCard } from "@/components/workout/SetCards";

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
