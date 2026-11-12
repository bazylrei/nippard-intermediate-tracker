"use client";

import { Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import WorkoutDetail from "@/components/workout-detail/WorkoutDetail";

function WorkoutDetailRoute() {
  const router = useRouter();
  const { sessionId } = useParams<{ sessionId: string }>();

  // Opened from a list in the app → go back to it; opened directly (shared link, new tab) → Home.
  const exit = () => (window.history.length > 1 ? router.back() : router.push("/"));

  return <WorkoutDetail key={sessionId} sessionId={sessionId} onExit={exit} />;
}

export default function WorkoutDetailPage() {
  return (
    <Suspense>
      <WorkoutDetailRoute />
    </Suspense>
  );
}
