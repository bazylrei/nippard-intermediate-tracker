import SectionHeading from "@/components/widgets/SectionHeading";
import type { CatalogExercise } from "@/lib/types";
import ExerciseRow from "./ExerciseRow";

/** One muscle group's exercises under its title; rows the viewer created are marked. */
export default function ExerciseGroup({ title, exercises, userId }: { title: string; exercises: CatalogExercise[]; userId: string | null }) {
  return (
    <section className="space-y-2">
      <SectionHeading className="px-1">{title}</SectionHeading>
      <ul className="glass gloss rounded-2xl divide-y divide-border overflow-hidden">
        {exercises.map((ex) => <ExerciseRow key={ex.id} exercise={ex} isOwn={ex.createdBy === userId} />)}
      </ul>
    </section>
  );
}
