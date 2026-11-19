import { Dumbbell } from "lucide-react";
import BackToProfile from "@/components/widgets/BackToProfile";

/** The My program screen's title, with the way back to Profile. */
export default function ProgramPageHeader({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-2 pt-2">
      <BackToProfile />
      <div className="w-9 h-9 glass gloss rounded-xl flex items-center justify-center">
        <Dumbbell className="text-primary" size={20} />
      </div>
      <h1 className="font-display font-bold text-base tracking-wide text-fg leading-tight">{name}</h1>
    </div>
  );
}
