// ─── Helpers ──────────────────────────────────────────────────────────────────

export function inferEquipment(exerciseName: string): string | null {
  const n = exerciseName;
  if (/\bDB\b|\bDumbbell\b/i.test(n)) return "dumbbell";
  if (/Pull-?Up|Chin-?Up|\bDip\b|Push-?Up|Hanging|Roman Chair|Nordic Ham/i.test(n)) return "bodyweight";
  if (/\bBarbell\b|\bEZ.?Bar\b/i.test(n)) return "barbell";
  if (/\bCable\b|Lat Pulldown|Face Pull|Bayesian/i.test(n)) return "cable";
  return null;
}

export function estimateOneRm(weight: number, reps: number): number {
  return Math.round(weight * (1 + reps / 30));
}

export function getSessionNumber(week: number, dayIndex: number): number {
  return (week - 1) * 5 + dayIndex + 1;
}

export function getTotalSessions(): number {
  return 60; // 12 weeks × 5 days
}

export const DAY_LABELS: Record<string, string> = {
  "upper-a": "Upper — Strength",
  "lower-a": "Lower — Strength",
  "back-biceps": "Pull — Hypertrophy",
  push: "Push — Hypertrophy",
  "lower-b": "Legs — Hypertrophy",
};
