import { Suspense } from "react";
import AppNav from "@/components/BottomNav";

/**
 * The active workout keeps the tab bar (so it needs no back/close button) but
 * not the resume-workout banner. Pages fill `.workout-viewport` — the screen
 * minus the tab bar — and scroll inside it.
 */
export default function WorkoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense>
        <AppNav />
      </Suspense>
      <div className="workout-viewport md:pl-56 overflow-y-auto">
        {children}
      </div>
    </>
  );
}
