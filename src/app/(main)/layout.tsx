import { Suspense } from "react";
import AppNav from "@/components/BottomNav";
import RestTimerBar from "@/components/RestTimerBar";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <RestTimerBar />
      <Suspense>
        <AppNav />
      </Suspense>
      {/* Bottom padding keeps content clear of the tab bar and its raised Workout tab. */}
      <div className="md:pl-56 pb-[calc(var(--app-nav-h)+var(--app-nav-raise)+1rem)] md:pb-0">
        {children}
      </div>
    </>
  );
}
