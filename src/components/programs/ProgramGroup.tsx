import SectionHeading from "@/components/widgets/SectionHeading";
import type { ProgramRow } from "@/lib/types";
import ProgramCard from "./ProgramCard";

interface Props {
  title: string;
  programs: ProgramRow[];
  /** The program the user follows, marked in the list. */
  currentId: string | null;
}

/** A titled list of program cards. */
export default function ProgramGroup({ title, programs, currentId }: Props) {
  return (
    <section className="space-y-2">
      <SectionHeading className="px-1">{title}</SectionHeading>
      <div className="space-y-2.5">
        {programs.map((p) => <ProgramCard key={p.id} program={p} isCurrent={p.id === currentId} />)}
      </div>
    </section>
  );
}
