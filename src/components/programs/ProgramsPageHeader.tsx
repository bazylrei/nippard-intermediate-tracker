import { LibraryBig, Plus } from "lucide-react";
import BackToProfile from "@/components/widgets/BackToProfile";

/** The My programs screen's title; "New program" shows once there's an account to own it. */
export default function ProgramsPageHeader({ canCreate, onNew }: { canCreate: boolean; onNew: () => void }) {
  return (
    <div className="flex items-center gap-2 pt-2">
      <BackToProfile />
      <div className="w-9 h-9 glass gloss rounded-xl flex items-center justify-center">
        <LibraryBig className="text-primary" size={20} />
      </div>
      <h1 className="flex-1 font-display font-bold text-xl text-fg">My programs</h1>
      {canCreate && (
        <button
          onClick={onNew}
          className="btn-primary gloss flex items-center gap-1.5 font-display font-bold text-sm px-4 py-2 rounded-xl cursor-pointer"
        >
          <Plus size={14} />
          New program
        </button>
      )}
    </div>
  );
}
