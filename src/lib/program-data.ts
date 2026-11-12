// ─── Helpers ──────────────────────────────────────────────────────────────────

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
