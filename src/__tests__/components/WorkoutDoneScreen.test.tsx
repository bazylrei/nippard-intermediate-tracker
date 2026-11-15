import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import WorkoutDoneScreen from "@/components/workout/WorkoutDoneScreen";
import type { Exercise, SetLog } from "@/lib/types";

// jsdom has no layout, so Recharts would draw nothing: stub it, recording what the chart is given.
type AxisProps = { dataKey?: string; tickFormatter?: (v: never) => string };
const chart = vi.hoisted(() => ({ data: [] as unknown[], x: null as AxisProps | null, y: null as AxisProps | null }));
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  LineChart: ({ data, children }: { data: unknown[]; children: React.ReactNode }) => { chart.data = data; return <div>{children}</div>; },
  XAxis: (props: AxisProps) => { chart.x = props; return null; },
  YAxis: (props: AxisProps) => { chart.y = props; return null; },
  CartesianGrid: () => null, Line: () => null, Tooltip: () => null,
}));

const exercise = { id: "bench", name: "Bench", muscleGroup: "chest", weightPerSide: false } as Exercise;
const sets = [{ id: "s", exerciseId: "bench", setIndex: 0, weight: 105, reps: 5 }] as SetLog[];
const postHistory = { bench: [{ date: "2026-11-05", weight: 100, reps: 5 }, { date: "2026-11-12", weight: 105, reps: 5 }] };

function renderDone(unit: "kg" | "lbs") {
  render(
    <WorkoutDoneScreen week={2} dayType="full-body" exercises={[exercise]} sessionSets={sets}
      postWorkout={{ history: postHistory, bodyWeightKg: null }} unit={unit} onHome={vi.fn()} onProgress={vi.fn()} />,
  );
}

describe("WorkoutDoneScreen", () => {
  it("converts the change vs last time to lbs (was kg labelled lbs)", () => {
    renderDone("lbs");
    expect(screen.getByText(/\+11lbs vs last/)).toBeInTheDocument(); // 5kg ≈ 11.02 lbs
    expect(screen.getByText("231.5lbs")).toBeInTheDocument(); // 105kg
  });

  it("shows kg as stored, and labels a builder day type", () => {
    renderDone("kg");
    expect(screen.getByText(/\+5kg vs last/)).toBeInTheDocument();
    expect(screen.getByText(/Full Body/)).toBeInTheDocument();
  });

  it("plots weight against date, with dated and unit-labelled axes", () => {
    renderDone("kg");

    expect(chart.data).toEqual([
      { date: "2026-11-05", weight: 100, isToday: false },
      { date: "2026-11-12", weight: 105, isToday: true },
    ]);
    expect(chart.x?.dataKey).toBe("date");
    expect(chart.x?.tickFormatter?.("2026-11-05" as never)).toBe("Nov 5");
    expect(chart.y?.tickFormatter?.(100 as never)).toBe("100kg");
  });

  it("plots and labels the weight axis in lbs for lbs users", () => {
    renderDone("lbs");

    expect(chart.data).toEqual([
      { date: "2026-11-05", weight: 220.5, isToday: false },
      { date: "2026-11-12", weight: 231.5, isToday: true },
    ]);
    expect(chart.y?.tickFormatter?.(220 as never)).toBe("220lbs");
  });

  it("doubles per-side weights in the volume", () => {
    const dbRow = { id: "db-row", name: "DB Row", muscleGroup: "back", weightPerSide: true, isBodyweight: false } as Exercise;
    const rowSets = [{ id: "r", exerciseId: "db-row", setIndex: 0, weight: 32.5, reps: 10 }] as SetLog[];
    render(<WorkoutDoneScreen week={2} dayType="full-body" exercises={[dbRow]} sessionSets={rowSets}
      postWorkout={{ history: {}, bodyWeightKg: null }} unit="kg" onHome={vi.fn()} onProgress={vi.fn()} />);
    expect(screen.getByText("Vol:").parentElement).toHaveTextContent("Vol: 650kg");
  });

  it("adds body weight to bodyweight exercises, and says when it's unknown", () => {
    const pullUp = { id: "pull-up", name: "Pull-up", muscleGroup: "back", weightPerSide: false, isBodyweight: true } as Exercise;
    const pullSets = [{ id: "p", exerciseId: "pull-up", setIndex: 0, weight: 10, reps: 8 }] as SetLog[];
    const props = { week: 2, dayType: "full-body", exercises: [pullUp], sessionSets: pullSets, unit: "kg" as const, onHome: vi.fn(), onProgress: vi.fn() };

    const { unmount } = render(<WorkoutDoneScreen {...props} postWorkout={{ history: {}, bodyWeightKg: 80 }} />);
    expect(screen.getByText("Vol:").parentElement).toHaveTextContent("Vol: 720kg"); // (80 + 10) × 8
    unmount();

    render(<WorkoutDoneScreen {...props} postWorkout={{ history: {}, bodyWeightKg: null }} />);
    expect(screen.getByText("Vol:").parentElement).toHaveTextContent("Vol: 80kg · added weight only");
  });
});

