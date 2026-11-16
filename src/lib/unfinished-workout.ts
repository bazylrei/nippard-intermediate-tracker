import { completeSession, deleteWorkoutSession } from "./db";
import { clearWorkoutInProgress } from "./workout-helpers";

/** What to do with an unfinished workout when another one is started. */
export type UnfinishedChoice = "save" | "discard";

/**
 * Settles the unfinished workout so another can start: "save" finishes it with
 * whatever was logged (not every workout is done in full), "discard" deletes it
 * and its sets. Rejects, leaving it unfinished, if the write fails.
 */
export async function settleUnfinishedWorkout(sessionId: string, choice: UnfinishedChoice): Promise<void> {
  if (choice === "save") await completeSession(sessionId);
  else await deleteWorkoutSession(sessionId);
  clearWorkoutInProgress();
}
