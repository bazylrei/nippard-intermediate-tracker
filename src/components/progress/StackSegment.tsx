import { Rectangle, type BarShapeProps } from "recharts";
import type { MuscleRegion } from "@/lib/muscle-regions";
import type { VolumeRow } from "./volume-chart";

/** Rounds only the top segment of each week's stack, the bar's data end. */
export default function StackSegment({ region, selectedWeek, ...props }: BarShapeProps & { region: MuscleRegion; selectedWeek: number | null }) {
  const row = props.payload as VolumeRow;
  // Once a week is picked, the others recede so the highlighted bar matches the details below.
  const dimmed = selectedWeek !== null && row.week !== selectedWeek;
  return <Rectangle {...props} fillOpacity={dimmed ? 0.4 : 1} radius={row.top === region ? [4, 4, 0, 0] : 0} />;
}
