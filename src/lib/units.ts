import type { UserPreferences } from "./types";

export type WeightUnit = UserPreferences["unit"];

/** Weight is always stored in kg; this is the only kg↔lbs factor in the app. */
export const KG_TO_LBS = 2.20462;

/** A stored kg value in the user's unit (lbs rounded to the nearest 0.25). */
export function kgToDisplay(kg: number, unit: WeightUnit): number {
  return unit === "lbs" ? Math.round(kg * KG_TO_LBS * 4) / 4 : kg;
}

/** A value typed in the user's unit, converted back to kg for storage. */
export function displayToKg(value: number, unit: WeightUnit): number {
  return unit === "lbs" ? value / KG_TO_LBS : value;
}
