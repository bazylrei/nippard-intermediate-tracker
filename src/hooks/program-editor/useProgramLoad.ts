import { useEffect, useState } from "react";
import { useRequireUser } from "@/context/AuthContext";
import { getAllExercises, getBuilderProgram } from "@/lib/db";
import type { BuilderProgram } from "@/lib/types";
import type { ExerciseInfo } from "@/components/builder/constants";

export type ProgramEditorStatus = "loading" | "failed" | "not-found" | "ready";

/** The program being edited and the exercise catalogue to pick from, loaded together once the user is known. */
export function useProgramLoad(programId: string) {
  const userId = useRequireUser()?.id ?? null;
  const [program, setProgram] = useState<BuilderProgram | null>(null);
  const [allExercises, setAllExercises] = useState<ExerciseInfo[]>([]);
  const [load, setLoad] = useState<"pending" | "failed" | "done">("pending");

  useEffect(() => {
    if (!userId) return;
    async function loadProgram() {
      try {
        const [data, exercises] = await Promise.all([getBuilderProgram(programId), getAllExercises()]);
        setProgram(data);
        setAllExercises(exercises);
        setLoad("done");
      } catch (error) {
        console.error(error);
        setLoad("failed");
      }
    }
    void loadProgram();
  }, [programId, userId]);

  const status: ProgramEditorStatus = load === "failed" ? "failed" : load === "pending" ? "loading" : program ? "ready" : "not-found";
  const change = (update: (p: BuilderProgram) => BuilderProgram) => setProgram((p) => (p ? update(p) : p));
  return { userId, status, program, allExercises, change };
}
