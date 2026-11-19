import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, act, within } from "@testing-library/react";
import type { RegionVolumes } from "@/lib/muscle-regions";
import { vi } from "vitest";
import ExerciseTab from "@/components/progress/ExerciseTab";
import VolumeTab from "@/components/progress/VolumeTab";

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
  const regions = (r: Partial<RegionVolumes>): RegionVolumes => ({ chest: 0, back: 0, shoulders: 0, arms: 0, legs: 0, core: 0, other: 0, ...r });
  const week = (n: number, r: Partial<RegionVolumes>) => {
    const byRegion = regions(r);
    return { week: n, volume: Object.values(byRegion).reduce((a, b) => a + b, 0), byRegion };
  };

  it("labels volume in the user's unit", () => {
    render(<VolumeTab volume={{ weeks: [week(1, { chest: 1000 })], missingBodyWeight: false }} unit="lbs" chartWidth={0} onLogBodyWeight={vi.fn()} />);
    expect(screen.getByText(/by body region \(lbs\)/)).toBeInTheDocument();
    expect(screen.queryByRole("note")).toBeNull();
  });

  it("lists the latest week's volume per region trained, in the user's unit, as the legend", () => {
    const weeks = [week(1, { chest: 1000, core: 50 }), week(2, { chest: 1000, legs: 2000 })];
    render(<VolumeTab volume={{ weeks, missingBodyWeight: false }} unit="lbs" chartWidth={0} onLogBodyWeight={vi.fn()} />);

    const legend = screen.getByRole("region", { name: "Week 2 volume by body region" });
    const rows = within(legend).getAllByRole("listitem").map((li) => li.textContent);
    // Every region trained in any week, in fixed order; core wasn't trained in week 2.
    expect(rows).toEqual(["Chest2,205 lbs", "Legs4,409 lbs", "Core0 lbs"]);
    expect(legend).toHaveTextContent("6,614 lbs");
  });

  it("stacks one coloured segment per region, with no highlight band behind a hovered week", async () => {
    const weeks = [week(1, { chest: 1000, back: 800 }), week(2, { chest: 1100, back: 900, legs: 1500 })];
    const { container } = render(<VolumeTab volume={{ weeks, missingBodyWeight: false }} unit="kg" chartWidth={360} onLogBodyWeight={vi.fn()} />);

    const fills = [...container.querySelectorAll(".recharts-bar-rectangle path")].map((p) => p.getAttribute("fill"));
    expect(new Set(fills)).toEqual(new Set(["var(--region-chest)", "var(--region-back)", "var(--region-legs)"]));

    // jsdom lays nothing out; give the chart its real size so the hover lands on week 2.
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({ x: 0, y: 0, left: 0, top: 0, right: 336, bottom: 260, width: 336, height: 260, toJSON: () => ({}) });
    await act(async () => {
      fireEvent.mouseMove(container.querySelector(".recharts-wrapper")!, { clientX: 250, clientY: 120 });
      await new Promise((resolve) => setTimeout(resolve, 50)); // recharts handles the move on the next frame
    });

    expect(screen.getByText("Week 2 · 3,500 kg")).toBeInTheDocument(); // the readout shows…
    expect(container.querySelector(".recharts-tooltip-cursor")).toBeNull(); // …without a highlight band
  });

  it("shows the details of the week tapped in the chart instead of the latest", async () => {
    const weeks = [week(1, { chest: 1000, core: 50 }), week(2, { chest: 1000, legs: 2000 })];
    const { container } = render(<VolumeTab volume={{ weeks, missingBodyWeight: false }} unit="kg" chartWidth={360} onLogBodyWeight={vi.fn()} />);
    expect(screen.getByRole("region", { name: "Week 2 volume by body region" })).toBeInTheDocument();

    // jsdom lays nothing out; give the chart its real size so the tap lands on week 1.
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({ x: 0, y: 0, left: 0, top: 0, right: 336, bottom: 260, width: 336, height: 260, toJSON: () => ({}) });
    const wrapper = container.querySelector(".recharts-wrapper")!;
    await act(async () => {
      fireEvent.mouseMove(wrapper, { clientX: 90, clientY: 120 });
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    await act(async () => { fireEvent.click(wrapper, { clientX: 90, clientY: 120 }); });

    const legend = screen.getByRole("region", { name: "Week 1 volume by body region" });
    expect(within(legend).getAllByRole("listitem").map((li) => li.textContent)).toEqual(["Chest1,000 kg", "Legs0 kg", "Core50 kg"]);
  });

  it("explains that bodyweight exercises are understated, with a way to log body weight right there", async () => {
    const onLogBodyWeight = vi.fn().mockResolvedValue(undefined);
    render(<VolumeTab volume={{ weeks: [week(1, { chest: 1000 })], missingBodyWeight: true }} unit="kg" chartWidth={0} onLogBodyWeight={onLogBodyWeight} />);
    expect(screen.getByRole("note")).toHaveTextContent("count only their added weight until you log your body weight");

    fireEvent.click(screen.getByRole("button", { name: "Log body weight" }));
    fireEvent.change(screen.getByLabelText("Body weight (kg)"), { target: { value: "80" } });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Save" })); });
    expect(onLogBodyWeight).toHaveBeenCalledWith(80);
  });
});
