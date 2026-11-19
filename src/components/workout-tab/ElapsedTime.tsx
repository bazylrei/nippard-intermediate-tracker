"use client";

import { useElapsedSeconds } from "@/hooks/useElapsedSeconds";
import { formatElapsed } from "@/lib/dates";

/** Time since `startedAt`, ticking. */
export default function ElapsedTime({ startedAt }: { startedAt: string }) {
  return <>{formatElapsed(useElapsedSeconds(startedAt))}</>;
}
