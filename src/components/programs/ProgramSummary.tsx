import Link from "next/link";
import { Globe, Lock, Pencil, Users } from "lucide-react";
import BackLink from "@/components/widgets/BackLink";
import { PROGRAMS_PATH, editProgramHref } from "@/lib/program-routes";
import type { BuilderProgram } from "@/lib/types";

interface Props {
  program: BuilderProgram;
  /** Shows the Edit button; the caller decides who may edit. */
  canEdit: boolean;
}

/** Who and what a program is, at the top of its preview. */
export default function ProgramSummary({ program, canEdit }: Props) {
  const VisibilityIcon = program.isPublic ? Globe : Lock;
  return (
    <header className="space-y-3">
      <div className="flex items-center gap-2 pt-2">
        <BackLink href={PROGRAMS_PATH} label="Back to My programs" />
        <p className="flex-1 font-display font-semibold text-xs uppercase tracking-widest text-muted">Program</p>
        {canEdit && (
          <Link
            href={editProgramHref(program.id)}
            className="btn-primary gloss flex items-center gap-1.5 font-display font-bold text-sm px-4 py-2 rounded-xl"
          >
            <Pencil size={14} />
            Edit
          </Link>
        )}
      </div>
      <div className="glass gloss rounded-2xl p-5 space-y-2">
        <h1 className="font-display font-bold text-2xl text-fg leading-tight">{program.name}</h1>
        {program.description && <p className="text-sm text-muted leading-relaxed">{program.description}</p>}
        <div className="flex items-center gap-3 text-xs text-subtle flex-wrap pt-1">
          {program.category && (
            <span className="bg-elevated text-muted px-2 py-0.5 rounded-full">{program.category}</span>
          )}
          <span>{program.totalWeeks} {program.totalWeeks === 1 ? "week" : "weeks"}</span>
          <span className="flex items-center gap-1">
            <Users size={11} />
            {program.userCount} {program.userCount === 1 ? "user" : "users"}
          </span>
          <span className="flex items-center gap-1">
            <VisibilityIcon size={11} />
            {program.isPublic ? "Public" : "Private"}
          </span>
        </div>
      </div>
    </header>
  );
}
