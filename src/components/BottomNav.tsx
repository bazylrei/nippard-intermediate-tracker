"use client";

import { usePathname, useRouter } from "next/navigation";
import { Dumbbell, House, ClipboardList, TrendingUp, Wrench, type LucideIcon } from "lucide-react";
import { useActiveWorkout } from "@/hooks/useActiveWorkout";
import { startWorkoutHref } from "@/lib/workout-history";

const TABS = [
  { href: "/",         label: "Home",     icon: House         },
  { href: "/program",  label: "Program",  icon: ClipboardList },
  { href: "/progress", label: "Progress", icon: TrendingUp },
  { href: "/builder",  label: "Builder",  icon: Wrench     },
] as const;

const WORKOUT_PATH = "/workout";

interface Tab {
  label: string;
  icon: LucideIcon;
  active: boolean;
  /** Where tapping goes; null when already there. */
  href: string | null;
}

/**
 * The fixed tabs, plus a Workout tab after Home while a workout is in progress
 * (or while on the workout screen) — it marks where you are and leads back.
 */
function useTabs(): Tab[] {
  const pathname = usePathname();
  const workout = useActiveWorkout();
  const onWorkout = pathname.startsWith(WORKOUT_PATH);

  const tabs: Tab[] = TABS.map(({ href, label, icon }) => ({
    label, icon, href,
    active: href === "/" ? pathname === "/" : pathname.startsWith(href),
  }));
  if (workout || onWorkout) {
    tabs.splice(1, 0, {
      label: "Workout",
      icon: Dumbbell,
      active: onWorkout,
      href: onWorkout || !workout ? null : startWorkoutHref(workout),
    });
  }
  return tabs;
}

export default function AppNav() {
  const router = useRouter();
  const tabs = useTabs();
  const select = ({ href }: Tab) => { if (href) router.push(href); };

  return (
    <>
      {/* Desktop: left sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-56 flex-col bg-surface border-r border-border p-4 z-40">
        <div className="flex items-center gap-2.5 px-2 py-3 mb-6">
          <Dumbbell size={22} className="text-primary" />
          <span className="font-display font-bold text-lg text-fg tracking-wide">Nippard</span>
        </div>
        <nav className="flex flex-col gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.label}
              onClick={() => select(tab)}
              aria-current={tab.active ? "page" : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors w-full cursor-pointer ${
                tab.active
                  ? "bg-primary/10 text-primary"
                  : "text-muted hover:text-fg hover:bg-elevated"
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Mobile: bottom bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-surface/95 backdrop-blur border-t border-border flex z-40 safe-bottom"
        style={{ height: "var(--app-nav-h)" }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.label}
            onClick={() => select(tab)}
            aria-current={tab.active ? "page" : undefined}
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
              tab.active ? "text-primary" : "text-subtle hover:text-muted"
            }`}
          >
            <tab.icon size={22} />
            <span className="text-xs font-medium">{tab.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
