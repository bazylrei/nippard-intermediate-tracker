import { Suspense } from "react";
import AppNav from "@/components/BottomNav";

/**
 * The active workout keeps the tab bar, so it needs no back/close button.
 * Pages fill `.workout-viewport` — the screen minus the tab bar — and own
 * their scrolling; the viewport itself never scrolls, so a page's scroll area can't
 * hand its overscroll on to a second pane.
 */
export default function WorkoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense>
        <AppNav />
      </Suspense>
      <div className="workout-viewport md:pl-56 overflow-hidden">
        {children}
      </div>
    </>
  );
}
