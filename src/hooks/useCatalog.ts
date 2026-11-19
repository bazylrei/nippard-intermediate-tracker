import { useEffect, useState } from "react";
import { useRequireUser } from "@/context/AuthContext";
import { getCatalog, getCatalogExercise } from "@/lib/db";
import type { CatalogExercise } from "@/lib/types";

type Status = "loading" | "ready" | "error";

/** Every exercise you can see, plus who you are (to tell your own apart). */
export function useCatalog(): { status: Status; exercises: CatalogExercise[]; userId: string | null } {
  const userId = useRequireUser()?.id ?? null;
  const [status, setStatus] = useState<Status>("loading");
  const [exercises, setExercises] = useState<CatalogExercise[]>([]);

  useEffect(() => {
    if (!userId) return;
    async function load() {
      try {
        setExercises(await getCatalog());
        setStatus("ready");
      } catch (error) {
        console.error(error);
        setStatus("error");
      }
    }
    void load();
  }, [userId]);

  return { status, exercises, userId };
}

/** One exercise; "missing" when it doesn't exist or you can't see it. */
export function useCatalogExercise(id: string): {
  status: Status | "missing";
  exercise: CatalogExercise | null;
  /** True when you added it, so you may edit or delete it. */
  isOwn: boolean;
} {
  const userId = useRequireUser()?.id ?? null;
  const [status, setStatus] = useState<Status | "missing">("loading");
  const [exercise, setExercise] = useState<CatalogExercise | null>(null);

  useEffect(() => {
    if (!userId) return;
    async function load() {
      try {
        const found = await getCatalogExercise(id);
        setExercise(found);
        setStatus(found ? "ready" : "missing");
      } catch (error) {
        console.error(error);
        setStatus("error");
      }
    }
    void load();
  }, [userId, id]);

  return { status, exercise, isOwn: !!exercise && exercise.createdBy === userId };
}
