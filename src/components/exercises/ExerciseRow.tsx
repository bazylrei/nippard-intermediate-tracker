import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { equipmentLabel } from "@/lib/exercise-form";
import { exerciseHref } from "@/lib/exercise-routes";
import type { CatalogExercise } from "@/lib/types";

/** One line of the exercise glossary, opening its detail. */
export default function ExerciseRow({ exercise, isOwn }: { exercise: CatalogExercise; isOwn: boolean }) {
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
