import type { SetLog } from "./types";
import { kgToDisplay, type WeightUnit } from "./units";

/** The weight step suggested after topping out a rep range, in the display unit. */
const WEIGHT_STEP: Record<WeightUnit, number> = { kg: 2.5, lbs: 5 };

export interface OverloadTip {
  /** Reps done last time — at or above the top of the range. */
  reps: number;
  /** The suggested weight for today, in the display unit. */
  suggestedWeight: number;
}

/**
 * Progressive overload: when last time's set reached the top of the rep range,
 * suggest the next weight step up for today. Null while there's still room to add reps,
 * or when the step wouldn't beat a heavier set from the same session (`lastSession`) —
 * that isn't progress, so it mustn't be offered as such.
 */
export function overloadTip(
  lastSet: SetLog | undefined,
  repRange: [number, number],
  unit: WeightUnit,
  lastSession: SetLog[] = [],
): OverloadTip | null {
  if (!lastSet || lastSet.reps < repRange[1]) return null;
  const suggested = Math.round((kgToDisplay(lastSet.weight, unit) + WEIGHT_STEP[unit]) * 100) / 100;
  const heaviest = Math.max(0, ...lastSession.map((s) => kgToDisplay(s.weight, unit)));
  if (suggested <= heaviest) return null;
  return { reps: lastSet.reps, suggestedWeight: suggested };
}
