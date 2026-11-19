"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import OverlayPresence from "@/components/widgets/OverlayPresence";
import FinishWorkoutSheet from "./FinishWorkoutSheet";

interface Props {
  /** Working sets logged so far. */
  setCount: number;
  onFinish: () => Promise<void>;
  onDiscard: () => Promise<void>;
}

/** Opens the sheet to finish, discard or carry on with the workout in progress. */
export default function FinishWorkoutButton({ setCount, onFinish, onDiscard }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-1.5 text-sm text-subtle hover:text-muted py-2 transition-colors cursor-pointer"
      >
        <Flag size={13} />
        Finish workout
      </button>
      <OverlayPresence>
        {open && <FinishWorkoutSheet setCount={setCount} onFinish={onFinish} onDiscard={onDiscard} onClose={() => setOpen(false)} />}
      </OverlayPresence>
    </>
  );
}
