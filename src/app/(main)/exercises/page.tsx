"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useCatalog } from "@/hooks/useCatalog";
import { MUSCLE_GROUPS } from "@/lib/exercise-form";
import { NEW_EXERCISE_PATH } from "@/lib/exercise-routes";
import FullScreenMessage from "@/components/widgets/FullScreenMessage";
import BackToProfile from "@/components/widgets/BackToProfile";
import ExerciseGroup from "@/components/exercises/ExerciseGroup";
import ExerciseSearchBox from "@/components/exercises/ExerciseSearchBox";

export default function ExercisesPage() {
  const { status, exercises, userId } = useCatalog();
  const [query, setQuery] = useState("");

  if (status === "error") return <FullScreenMessage message="Couldn't load exercises. Check your connection and try again." />;
  if (status === "loading") return <FullScreenMessage message="Loading…" />;

  const q = query.trim().toLowerCase();
  const matching = q ? exercises.filter((ex) => ex.name.toLowerCase().includes(q)) : exercises;
  // Muscle groups in body order; each group's exercises stay sorted by name.
  const groups = MUSCLE_GROUPS
    .map((g) => ({ ...g, exercises: matching.filter((ex) => ex.muscleGroup === g.value) }))
    .filter((g) => g.exercises.length > 0);

  return (
    <div className="main-min-viewport max-w-lg md:max-w-2xl mx-auto flex flex-col p-4 md:p-8 gap-4">
      <header className="flex items-center gap-2 pt-2">
        <BackToProfile />
        <h1 className="font-display font-bold text-xl text-fg flex-1">Exercises</h1>
        <Link href={NEW_EXERCISE_PATH} className="btn-primary flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-display font-semibold">
          <Plus size={16} /> Add
        </Link>
      </header>

      <ExerciseSearchBox value={query} onChange={setQuery} />

      {groups.length === 0 && <p className="text-sm text-muted text-center py-12">No exercises match “{query}”.</p>}

      {groups.map((group) => <ExerciseGroup key={group.value} title={group.label} exercises={group.exercises} userId={userId} />)}
    </div>
  );
}
