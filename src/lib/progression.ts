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
 * suggest the next weight step up for today. Null while there's still room to add reps.
 */
export function overloadTip(lastSet: SetLog | undefined, repRange: [number, number], unit: WeightUnit): OverloadTip | null {
  if (!lastSet || lastSet.reps < repRange[1]) return null;
  const suggested = kgToDisplay(lastSet.weight, unit) + WEIGHT_STEP[unit];
  return { reps: lastSet.reps, suggestedWeight: Math.round(suggested * 100) / 100 };
}
