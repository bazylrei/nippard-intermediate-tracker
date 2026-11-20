import Link from "next/link";
import { Play, TrendingUp } from "lucide-react";
import ChooseProgramCard from "@/components/widgets/ChooseProgramCard";
import { PROGRAMS_PATH } from "@/lib/program-routes";

interface Props {
  /** Following a program: offer its next workout. Otherwise, offer to choose one. */
  hasProgram: boolean;
  onStartWorkout: () => void;
}

/** Progress before anything is logged: what will show here, and the way to get there. */
export default function ProgressEmptyState({ hasProgram, onStartWorkout }: Props) {
  return (
    <div className="flex flex-col gap-6 py-6">
      <div className="flex flex-col items-center text-center gap-3">
        <div className="w-14 h-14 glass gloss rounded-2xl flex items-center justify-center">
          <TrendingUp className="text-primary" size={26} />
        </div>
        <h2 className="font-display font-bold text-xl text-fg">Your progress shows up here</h2>
        <p className="text-sm text-muted max-w-xs">
          Finish a workout and you&apos;ll see your lifts climb and your weekly volume build, week by week.
        </p>
      </div>

      {hasProgram ? (
        <div className="space-y-2">
          <button
            onClick={onStartWorkout}
            className="btn-primary gloss w-full flex items-center justify-center gap-2 font-display font-bold text-base py-3.5 rounded-2xl cursor-pointer"
          >
            <Play size={16} fill="currentColor" />
            Start a workout
          </button>
          <Link href={PROGRAMS_PATH} className="block text-center text-sm text-muted hover:text-fg py-1">
            Choose a different program
          </Link>
        </div>
      ) : (
        <ChooseProgramCard heading="Pick a program to start" />
      )}
    </div>
  );
}
