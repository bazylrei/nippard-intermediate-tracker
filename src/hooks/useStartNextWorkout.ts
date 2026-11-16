import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { requireSignedInUser } from "@/lib/require-user";
import { findNextWorkout } from "@/lib/next-workout";
import { startWorkoutHref } from "@/lib/workout-history";
import { useProgramContext } from "@/context/ProgramContext";

const HOME = "/";

/**
 * Opens the next workout (or resumes the unfinished one). When it can't be
 * worked out (schedule not loaded yet, or the lookup failed), goes Home instead,
 * where the next-workout card loads it or shows its own load error.
 */
export function useStartNextWorkout(): () => Promise<void> {
  const router = useRouter();
  const { program } = useProgramContext();

  return useCallback(async () => {
    const user = await requireSignedInUser(router);
    if (!user) return;
    let next = null;
    try {
      next = await findNextWorkout(user.id, program);
    } catch (error) {
      console.error(error);
    }
    router.push(next ? startWorkoutHref(next) : HOME);
  }, [router, program]);
}
