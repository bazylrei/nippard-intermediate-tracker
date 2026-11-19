"use client";

import { useEffect, useState, type ReactNode } from "react";

/** How long a closing overlay stays mounted; keep in step with the exit animations in globals.css. */
export const OVERLAY_EXIT_MS = 180;

/**
 * Lets an overlay animate out. Wrap the conditional render of a sheet or modal:
 *
 *   <OverlayPresence>{open && <Sheet onClose={() => setOpen(false)} />}</OverlayPresence>
 *
 * When the content goes away, the last overlay stays mounted for OVERLAY_EXIT_MS, marked
 * `data-closing` (globals.css plays the exit animation) and inert, then is dropped.
 * Opening again, even mid-exit, shows a fresh overlay.
 */
export default function OverlayPresence({ children }: { children: ReactNode }) {
  const present = Boolean(children);
  const [last, setLast] = useState<ReactNode>(children); // the last live content, shown while exiting
  const [wasPresent, setWasPresent] = useState(present);
  const [exiting, setExiting] = useState(false);
  const [generation, setGeneration] = useState(0);

  // Adjusted during render, not in an effect, so the overlay never unmounts for a frame between live and exiting.
  // The re-render this triggers gets the same `children`, so it settles.
  if (present && last !== children) setLast(children);
  if (present !== wasPresent) {
    setWasPresent(present);
    setExiting(!present);
    if (present) setGeneration((g) => g + 1);
  }

  useEffect(() => {
    if (!exiting) return;
    const timer = setTimeout(() => setExiting(false), OVERLAY_EXIT_MS);
    return () => clearTimeout(timer);
  }, [exiting]);

  const content = present ? children : exiting ? last : null;
  if (!content) return null;
  return (
    <div key={generation} style={{ display: "contents" }} data-closing={exiting || undefined} inert={exiting}>
      {content}
    </div>
  );
}
