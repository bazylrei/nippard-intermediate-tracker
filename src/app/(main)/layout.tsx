import { Suspense } from "react";
import AppNav from "@/components/BottomNav";
import ActiveWorkoutBanner from "@/components/ActiveWorkoutBanner";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense>
        <AppNav />
        <ActiveWorkoutBanner />
      </Suspense>
      <div className="md:pl-56 pb-32 md:pb-0">
        {children}
      </div>
    </>
  );
}
