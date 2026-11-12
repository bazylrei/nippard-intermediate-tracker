import { useEffect, useMemo, useState } from "react";
import { getAllExercises } from "@/lib/db";
import { useProgramContext } from "@/context/ProgramContext";

export interface ExerciseOption {
  id: string;
  name: string;
}

/**
 * Every known exercise: the DB catalogue plus the active program's names
 * (program wins, so the label matches what you saw while training).
 */
export function useExerciseCatalog(): { nameOf: (id: string) => string; options: ExerciseOption[] } {
  const { program } = useProgramContext();
  const [dbExercises, setDbExercises] = useState<ExerciseOption[]>([]);

  useEffect(() => {
    getAllExercises()
      .then((rows) => setDbExercises(rows.map(({ id, name }) => ({ id, name }))))
      .catch((error) => console.error(error)); // names fall back to the program's below
  }, []);

  return useMemo(() => {
    const names = new Map(dbExercises.map((e) => [e.id, e.name]));
    for (const week of program) {
      for (const day of week.days) {
        for (const ex of day.exercises) names.set(ex.id, ex.name);
      }
    }
    const options = Array.from(names, ([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return { nameOf: (id: string) => names.get(id) ?? id, options };
  }, [dbExercises, program]);
}
