import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { SIGN_IN_PATH } from "@/lib/auth-paths";
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
  const { status, user } = useAuth();
  const { program } = useProgramContext();

  return useCallback(async () => {
    if (status === "signedOut") router.replace(SIGN_IN_PATH);
    if (!user) return; // signed out, or the stored session is still being read
    let next = null;
    try {
      next = await findNextWorkout(program);
    } catch (error) {
      console.error(error);
    }
    router.push(next ? startWorkoutHref(next) : HOME);
  }, [router, status, user, program]);
}
