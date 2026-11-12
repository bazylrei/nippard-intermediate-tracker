import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import ExerciseTab from "@/app/(main)/progress/ExerciseTab";
import VolumeTab from "@/app/(main)/progress/VolumeTab";

const history = [
  { date: "2026-11-01", weight: 100, reps: 8, dayType: "pull" },
  { date: "2026-11-08", weight: 102.5, reps: 8, dayType: "" },
];
const options = [{ id: "bench", name: "Bench" }, { id: "curl", name: "Curl" }];

describe("ExerciseTab", () => {
  it("lists weights in lbs for an lbs user (previously always kg)", () => {
    render(<ExerciseTab options={options} selectedId="bench" onSelect={vi.fn()} history={history} unit="lbs" chartWidth={0} />);
    expect(screen.getByText("220.5lbs × 8 reps")).toBeInTheDocument();
    expect(screen.getByText("226lbs × 8 reps")).toBeInTheDocument();
  });

  it("shows kg unchanged, and labels builder day types", () => {
    render(<ExerciseTab options={options} selectedId="bench" onSelect={vi.fn()} history={history} unit="kg" chartWidth={0} />);
    expect(screen.getByText("100kg × 8 reps")).toBeInTheDocument();
    expect(screen.getByText("Pull")).toBeInTheDocument();
  });

  it("switches exercise", () => {
    const onSelect = vi.fn();
    render(<ExerciseTab options={options} selectedId="bench" onSelect={onSelect} history={[]} unit="kg" chartWidth={0} />);
    fireEvent.change(screen.getByLabelText("Exercise"), { target: { value: "curl" } });
    expect(onSelect).toHaveBeenCalledWith("curl");
    expect(screen.getByText("No data for this exercise yet.")).toBeInTheDocument();
  });

  it("explains when nothing has been logged", () => {
    render(<ExerciseTab options={[]} selectedId="" onSelect={vi.fn()} history={[]} unit="kg" chartWidth={0} />);
    expect(screen.getByText(/No exercise data yet/)).toBeInTheDocument();
  });
});

describe("VolumeTab", () => {
  it("labels volume in the user's unit", () => {
    render(<VolumeTab volume={[{ week: 1, volume: 1000 }]} unit="lbs" chartWidth={0} />);
    expect(screen.getByText(/weekly training volume \(lbs\)/)).toBeInTheDocument();
  });
});
