"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Plus, Search } from "lucide-react";
import { useCatalog } from "@/hooks/useCatalog";
import { MUSCLE_GROUPS, equipmentLabel } from "@/lib/exercise-form";
import { exerciseHref, NEW_EXERCISE_PATH } from "@/lib/exercise-routes";
import FullScreenMessage from "@/components/FullScreenMessage";
import BackToProfile from "@/components/BackToProfile";
import type { CatalogExercise } from "@/lib/types";

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
    <div className="min-h-screen max-w-lg md:max-w-2xl mx-auto flex flex-col p-4 md:p-8 gap-4">
      <header className="flex items-center gap-2 pt-2">
        <BackToProfile />
        <h1 className="font-display font-bold text-xl text-fg flex-1">Exercises</h1>
        <Link href={NEW_EXERCISE_PATH} className="btn-primary flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-display font-semibold">
          <Plus size={16} /> Add
        </Link>
      </header>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
        <input
          type="search"
          aria-label="Search exercises"
          placeholder="Search exercises…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-xl pl-9 pr-3 py-2.5 text-sm text-fg bg-elevated border border-border focus:outline-none focus:border-primary"
        />
      </div>

      {groups.length === 0 && <p className="text-sm text-muted text-center py-12">No exercises match “{query}”.</p>}

      {groups.map((group) => (
        <section key={group.value} className="space-y-2">
          <h2 className="font-display font-bold text-xs uppercase tracking-widest text-muted px-1">{group.label}</h2>
          <ul className="glass gloss rounded-2xl divide-y divide-border overflow-hidden">
            {group.exercises.map((ex) => <ExerciseRow key={ex.id} exercise={ex} isOwn={ex.createdBy === userId} />)}
          </ul>
        </section>
      ))}
    </div>
  );
}

function ExerciseRow({ exercise, isOwn }: { exercise: CatalogExercise; isOwn: boolean }) {
  const equipment = equipmentLabel(exercise.equipment);
  return (
    <li>
      <Link href={exerciseHref(exercise.id)} className="flex items-center gap-3 px-4 py-3 hover:bg-elevated transition-colors">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-fg truncate">{exercise.name}</p>
          {equipment && <p className="text-xs text-subtle">{equipment}</p>}
        </div>
        {isOwn && <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Yours</span>}
        <ChevronRight size={16} className="text-subtle shrink-0" />
      </Link>
    </li>
  );
}
