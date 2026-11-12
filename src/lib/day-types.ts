/**
 * The one table of day types. The builder offers these as presets but also
 * accepts free-text custom types, so a day type is any string.
 */
export const DAY_TYPE_PRESETS: readonly { value: string; label: string }[] = [
  // The Nippard Intermediate program's five days, labelled by their focus.
  { value: "upper-a",        label: "Upper — Strength" },
  { value: "lower-a",        label: "Lower — Strength" },
  { value: "back-biceps",    label: "Pull — Hypertrophy" },
  { value: "push",           label: "Push — Hypertrophy" },
  { value: "lower-b",        label: "Legs — Hypertrophy" },
  // Other presets.
  { value: "pull",           label: "Pull" },
  { value: "legs",           label: "Legs" },
  { value: "upper-b",        label: "Upper B" },
  { value: "full-body",      label: "Full Body" },
  { value: "chest-triceps",  label: "Chest & Triceps" },
  { value: "shoulders-arms", label: "Shoulders & Arms" },
  { value: "cardio",         label: "Cardio" },
];

const LABELS = new Map(DAY_TYPE_PRESETS.map((p) => [p.value, p.label]));

/** Display name for a day type; custom types are shown as typed. */
export function dayLabel(dayType: string): string {
  return LABELS.get(dayType) ?? dayType;
}
