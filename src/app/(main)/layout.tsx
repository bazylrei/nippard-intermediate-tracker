import { Suspense } from "react";
import AppNav from "@/components/BottomNav";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense>
        <AppNav />
      </Suspense>
      <div className="md:pl-56 pb-20 md:pb-0">
        {children}
      </div>
    </>
  );
}
