/**
 * Turns the alternate *names* in the static program into exercises. An alternate that names one of the program's
 * own exercises points at it; any other becomes a new exercise (id "alt-<slug>", as migration 009 names them) with
 * the muscle group, rest and warm-up of the first exercise that lists it. Per-side / bodyweight flags aren't managed
 * here (nor are they for the program's own exercises): set them in the database.
 */
export interface ExerciseSeedRow {
  id: string;
  name: string;
  muscle_group: string;
  rest_min: number;
  rest_max: number;
  warmup_protocol: string;
  form_note: string | null;
}

interface StaticSlot {
  muscleGroup: string;
  restSeconds: [number, number];
  warmupProtocol: string;
  alternates: [string, string];
}

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export function planAlternates(program: { days: { exercises: StaticSlot[] }[] }[], mainRows: ExerciseSeedRow[]) {
  const mainIdByName = new Map(mainRows.map((row) => [row.name.toLowerCase(), row.id]));
  const alternateId = (name: string) => mainIdByName.get(name.toLowerCase()) ?? `alt-${slug(name)}`;

  const rows: ExerciseSeedRow[] = [];
  const seen = new Set<string>();
  for (const week of program) {
    for (const day of week.days) {
      for (const ex of day.exercises) {
        for (const name of ex.alternates) {
          const id = alternateId(name);
          if (!name || mainIdByName.has(name.toLowerCase()) || seen.has(id)) continue;
          seen.add(id);
          rows.push({
            id, name, muscle_group: ex.muscleGroup, rest_min: ex.restSeconds[0], rest_max: ex.restSeconds[1],
            warmup_protocol: ex.warmupProtocol, form_note: null,
          });
        }
      }
    }
  }
  return { alternateId, rows };
}
