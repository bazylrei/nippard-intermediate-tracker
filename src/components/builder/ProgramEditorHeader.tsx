import { ArrowLeft, Globe, Lock, Pencil, Users } from "lucide-react";
import type { BuilderProgram } from "@/lib/types";

interface Props {
  program: BuilderProgram;
  isOwner: boolean;
  onBack: () => void;
  onEdit: () => void;
  onTogglePublic: () => void;
}

export default function ProgramEditorHeader({ program, isOwner, onBack, onEdit, onTogglePublic }: Props) {
  return (
    <div className="flex items-start gap-3">
      <button onClick={onBack} className="mt-0.5 text-muted hover:text-fg transition-colors shrink-0">
        <ArrowLeft size={20} />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-lg font-bold text-fg truncate">{program.name}</h1>
          {isOwner && (
            <button onClick={onEdit} className="text-subtle hover:text-primary transition-colors">
              <Pencil size={14} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          {program.category && (
            <span className="text-xs bg-elevated text-muted px-2 py-0.5 rounded-full">{program.category}</span>
          )}
          <span className="text-xs text-subtle">{program.totalWeeks} {program.totalWeeks === 1 ? "week" : "weeks"}</span>
          <span className="flex items-center gap-1 text-xs text-subtle">
            <Users size={11} /> {program.userCount} {program.userCount === 1 ? "user" : "users"}
          </span>
        </div>
        {program.description && <p className="text-sm text-subtle mt-1">{program.description}</p>}
      </div>
      {isOwner && (
        <button
          onClick={onTogglePublic}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors shrink-0 ${
            program.isPublic ? "bg-accent/10 text-accent hover:bg-accent/20" : "bg-elevated text-muted hover:bg-border"
          }`}
        >
          {program.isPublic ? <Globe size={13} /> : <Lock size={13} />}
          {program.isPublic ? "Public" : "Private"}
        </button>
      )}
    </div>
  );
}
