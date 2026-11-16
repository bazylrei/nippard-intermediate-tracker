"use client";

import { usePathname, useRouter } from "next/navigation";
import { Dumbbell, House, TrendingUp, UserRound, UsersRound, type LucideIcon } from "lucide-react";
import { useActiveWorkout } from "@/hooks/useActiveWorkout";
import { useStartNextWorkout } from "@/hooks/useStartNextWorkout";
import { CenterWorkoutTab, SidebarWorkoutTab } from "./WorkoutTab";
import { startWorkoutHref } from "@/lib/workout-history";

/** Two tabs either side of the Workout button, which always sits in the middle. */
const LEADING_TABS = [
  { href: "/",         label: "Home",     icon: House      },
  { href: "/progress", label: "Progress", icon: TrendingUp },
] as const;
const TRAILING_TABS = [
  { href: "/community", label: "Community", icon: UsersRound },
  { href: "/profile",   label: "Profile",   icon: UserRound  },
] as const;

const WORKOUT_PATH = "/workout";

/** Pages that belong to a tab without being under its path: everything opened from Profile. */
const ALSO_ACTIVE_ON: Record<string, string[]> = { "/profile": ["/program", "/programs", "/exercises", "/settings"] };

interface Tab {
  label: string;
  icon: LucideIcon;
  active: boolean;
  /** Where tapping goes; null when already there (or, for an idle Workout tab, when it starts the next workout). */
  href: string | null;
  /** Set on the Workout tab. */
  workout?: {
    /** No workout in progress: the tab starts the next one. */
    idle: boolean;
    startedAt?: string;
  };
}

function isActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return [href, ...(ALSO_ACTIVE_ON[href] ?? [])].some((path) => pathname.startsWith(path));
}

/**
 * The fixed tabs with the Workout tab always in the middle. While a workout is
 * in progress it shows the live clock and leads back; otherwise it starts the next one.
 */
function useTabs(): Tab[] {
  const pathname = usePathname();
  const workout = useActiveWorkout();
  const onWorkout = pathname.startsWith(WORKOUT_PATH);
  const toTab = ({ href, label, icon }: { href: string; label: string; icon: LucideIcon }): Tab =>
    ({ label, icon, href, active: isActive(href, pathname) });

  // On the workout screen (including its finished screen, after the workout is cleared) the tab marks where you are.
  const idle = !workout && !onWorkout;
  const workoutTab: Tab = {
    label: idle ? "Start" : "Workout",
    icon: Dumbbell,
    active: onWorkout,
    href: workout && !onWorkout ? startWorkoutHref(workout) : null,
    workout: { idle, startedAt: workout?.startedAt },
  };
  return [...LEADING_TABS.map(toTab), workoutTab, ...TRAILING_TABS.map(toTab)];
}

export default function AppNav() {
  const router = useRouter();
  const tabs = useTabs();
  const startNextWorkout = useStartNextWorkout();
  const select = ({ href, workout }: Tab) => {
    if (href) router.push(href);
    else if (workout?.idle) void startNextWorkout();
  };

  return (
    <>
      {/* Desktop: left sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-56 flex-col bg-surface border-r border-border p-4 z-40">
        <div className="flex items-center gap-2.5 px-2 py-3 mb-6">
          <Dumbbell size={22} className="text-primary" />
          <span className="font-display font-bold text-lg text-fg tracking-wide">Nippard</span>
        </div>
        <nav className="flex flex-col gap-1">
          {tabs.map((tab) => tab.workout ? (
            <SidebarWorkoutTab key="workout" {...tab.workout} active={tab.active} onSelect={() => select(tab)} />
          ) : (
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
        {tabs.map((tab) => tab.workout ? (
          <CenterWorkoutTab key="workout" {...tab.workout} active={tab.active} onSelect={() => select(tab)} />
        ) : (
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
