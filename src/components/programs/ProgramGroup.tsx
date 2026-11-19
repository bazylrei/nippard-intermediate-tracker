import SectionHeading from "@/components/widgets/SectionHeading";
import type { ProgramRow } from "@/lib/types";
import ProgramCard from "./ProgramCard";

/** A titled list of program cards. */
export default function ProgramGroup({ title, programs }: { title: string; programs: ProgramRow[] }) {
  return (
    <section className="space-y-2">
      <SectionHeading className="px-1">{title}</SectionHeading>
      <div className="space-y-2.5">
        {programs.map((p) => <ProgramCard key={p.id} program={p} />)}
      </div>
    </section>
  );
}
