import { useState } from "react";
import { Check, Play } from "lucide-react";

interface Props {
  /** Whether the user already follows this program. */
  isCurrent: boolean;
  /** Follow this program / stop following it. Report their own failure. */
  onFollow: () => Promise<void>;
  onStopFollowing: () => Promise<void>;
}

/** On a program's preview: follow it, or, if it's the one you follow, say so and offer to stop. */
export default function FollowProgramControl({ isCurrent, onFollow, onStopFollowing }: Props) {
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  }

  if (isCurrent) {
    return (
      <div className="flex items-center justify-between gap-3 bg-surface border border-border rounded-2xl px-4 py-3">
        <span className="flex items-center gap-2 font-display font-semibold text-sm text-fg">
          <Check size={16} className="text-primary" />
          You&apos;re following this program
        </span>
        <button
          onClick={() => run(onStopFollowing)}
          disabled={busy}
          className="text-sm text-muted hover:text-fg cursor-pointer disabled:opacity-60"
        >
          Stop following
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => run(onFollow)}
      disabled={busy}
      className="btn-primary gloss w-full flex items-center justify-center gap-2 font-display font-bold text-base py-3.5 rounded-2xl cursor-pointer disabled:opacity-60"
    >
      <Play size={16} fill="currentColor" />
      Follow this program
    </button>
  );
}
