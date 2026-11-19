import SectionHeading from "@/components/widgets/SectionHeading";

/** A titled card of Profile rows. */
export default function ProfileSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <SectionHeading className="px-1">{title}</SectionHeading>
      <div className="glass gloss rounded-2xl divide-y divide-border overflow-hidden">{children}</div>
    </section>
  );
}
