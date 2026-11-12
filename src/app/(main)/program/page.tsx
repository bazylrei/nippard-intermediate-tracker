"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth";
import { requireSignedInUser, SIGN_IN_PATH } from "@/lib/require-user";
import { ACTIVE_PROGRAM_NAME } from "@/lib/program-db";
import { getCompletedSlots, getIncompleteSession, getPreferences, upsertPreferences, type CompletedSlot } from "@/lib/db";
import { getSessionNumber, getTotalSessions, nextWorkout } from "@/lib/program-data";
import { useProgramContext } from "@/context/ProgramContext";
import type { UserPreferences, WorkoutPosition } from "@/lib/types";
import { latestSessionBySlot, startWorkoutHref, workoutDetailHref } from "@/lib/workout-history";
import NextWorkoutCard from "@/components/workouts/NextWorkoutCard";
import WeekDayTile from "@/components/program/WeekDayTile";
import SettingsPanel from "@/components/program/SettingsPanel";
import SaveErrorAlert from "@/components/SaveErrorAlert";
import { useSaveError } from "@/hooks/useSaveError";
import FullScreenMessage from "@/components/FullScreenMessage";
import { cacheGet, cacheSet } from "@/lib/cache";
import { cachePrefs, DEFAULT_PREFS, readCachedPrefs } from "@/lib/prefs-cache";
import { Dumbbell, LogOut, Settings } from "lucide-react";

const CACHE_KEY = "dashboard-v4";

type CachedDashboard = {
  resume: WorkoutPosition | null;
  /** Newest first; the first entry is the last completed workout. */
  completed: CompletedSlot[];
  email: string;
};

export default function MyProgram() {
  const router = useRouter();
  const { program } = useProgramContext();
  const cached = cacheGet<CachedDashboard>(CACHE_KEY);
  const [loading, setLoading] = useState(!cached);
  const [loadFailed, setLoadFailed] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState(cached?.email ?? "");
  const [resume, setResume] = useState<WorkoutPosition | null>(cached?.resume ?? null);
  const [completed, setCompleted] = useState<CompletedSlot[]>(cached?.completed ?? []);
  const [prefs, setPrefs] = useState<UserPreferences>(() => readCachedPrefs() ?? DEFAULT_PREFS);
  const [showSettings, setShowSettings] = useState(false);
  const saveError = useSaveError();

  useEffect(() => {
    async function init() {
      const user = await requireSignedInUser(router);
      if (!user) return;
      setUserId(user.id);

      let incomplete, slots, p;
      try {
        [incomplete, slots, p] = await Promise.all([
          getIncompleteSession(user.id),
          getCompletedSlots(user.id),
          getPreferences(user.id),
        ]);
      } catch (error) {
        console.error(error);
        setLoadFailed(true);
        return;
      }
      const resumeAt = incomplete ? { week: incomplete.week, dayIndex: incomplete.dayIndex } : null;
      const resolvedEmail = user.email ?? "";
      setResume(resumeAt);
      setCompleted(slots);
      setPrefs(p);
      setEmail(resolvedEmail);
      cacheSet(CACHE_KEY, { resume: resumeAt, completed: slots, email: resolvedEmail });
      cachePrefs(p);
      setLoading(false);
    }
    void init();
  }, [router]);

  async function handleSignOut() {
    if (await saveError.attempt(signOut, "Couldn't sign out. Try again.")) router.replace(SIGN_IN_PATH);
  }

  function applyPrefs(next: UserPreferences) {
    setPrefs(next);
    cachePrefs(next);
  }

  /** Optimistic: shows the change at once, reverts it and says so if the save fails. */
  async function savePrefs(patch: Partial<UserPreferences>, failureMessage: string) {
    if (!userId) return;
    const previous = prefs;
    applyPrefs({ ...prefs, ...patch });
    const ok = await saveError.attempt(() => upsertPreferences(userId, patch), failureMessage);
    if (!ok) applyPrefs(previous);
  }

  const toggleUnit = () =>
    savePrefs({ unit: prefs.unit === "kg" ? "lbs" : "kg" }, "Couldn't change the weight unit. Try again.");

  const saveBodyStats = (stats: { bodyWeightKg: number | null; heightCm: number | null }) =>
    savePrefs(stats, "Couldn't save your body stats. Try again.");

  // With a cached dashboard on screen, a failed refresh just leaves it as is.
  if (loading && loadFailed) return <FullScreenMessage message="Couldn't load your program. Check your connection and try again." />;
  if (loading) return <FullScreenMessage message="Loading…" />;

  // Derived from the program's real schedule — it can have any number of weeks and days.
  const nextSession = resume ?? nextWorkout(completed[0] ?? null, program);
  const sessionAt = latestSessionBySlot(completed);
  const hasResume = !!resume;
  const totalWeeks = program.length;
  const nextDay = nextSession ? program.find((w) => w.week === nextSession.week)?.days[nextSession.dayIndex] : null;
  const sessionNum = nextSession ? getSessionNumber(nextSession, program) : 1;
  const totalSessions = getTotalSessions(program);
  const progressPct = totalSessions ? Math.round(((sessionNum - 1) / totalSessions) * 100) : 0;
  const weekDays = program.find((w) => w.week === (nextSession?.week ?? 1))?.days ?? [];

  return (
    <div className="min-h-screen max-w-lg md:max-w-2xl mx-auto flex flex-col p-4 md:p-8 gap-4">

      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 glass gloss rounded-xl flex items-center justify-center">
            <Dumbbell className="text-primary" size={20} />
          </div>
          <div>
            <h1 className="font-display font-bold text-base tracking-wide text-fg leading-tight">{ACTIVE_PROGRAM_NAME}</h1>
            <p className="text-xs text-muted">{email}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 transition-colors rounded-xl cursor-pointer ${showSettings ? "glass text-primary" : "text-muted hover:text-fg"}`}
          >
            <Settings size={18} />
          </button>
          <button onClick={handleSignOut} className="p-2 text-muted hover:text-fg transition-colors rounded-xl cursor-pointer">
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {saveError.message && <SaveErrorAlert message={saveError.message} onDismiss={saveError.clear} />}

      {showSettings && <SettingsPanel prefs={prefs} onToggleUnit={toggleUnit} onSaveBodyStats={saveBodyStats} />}

      {/* Program progress */}
      <div className="glass gloss rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-display font-semibold text-xs uppercase tracking-widest text-muted">Program Progress</span>
          <span className="font-display font-bold text-sm text-fg">
            {Math.max(0, sessionNum - 1)}<span className="text-muted font-normal"> / {totalSessions}</span>
          </span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "color-mix(in srgb, var(--fg) 10%, transparent)" }}>
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%`, boxShadow: "0 0 8px var(--primary)" }}
          />
        </div>
        <div className="flex justify-between text-xs text-subtle">
          <span>Week 1</span>
          <span className="text-muted font-display font-semibold">{progressPct}% complete</span>
          <span>Week {totalWeeks}</span>
        </div>
      </div>

      {nextSession && nextDay && (
        <NextWorkoutCard
          week={nextSession.week}
          totalWeeks={totalWeeks}
          sessionNumber={sessionNum}
          day={nextDay}
          isResume={hasResume}
          onStart={() => router.push(startWorkoutHref(nextSession))}
        />
      )}

      {/* Week overview — 2×N grid tiles */}
      <div className="space-y-3">
        <h3 className="font-display font-bold text-xs uppercase tracking-widest text-muted px-1">
          Week {nextSession?.week ?? 1} Overview
        </h3>
        <div className="grid grid-cols-2 gap-2.5">
          {weekDays.map((day, i) => {
            const week = nextSession?.week ?? 1;
            const isDone = nextSession ? i < nextSession.dayIndex : false;
            const sessionId = isDone ? sessionAt({ week, dayIndex: i }) : undefined;
            return (
              <WeekDayTile
                key={i}
                day={day}
                number={i + 1}
                isDone={isDone}
                isNext={i === nextSession?.dayIndex}
                href={sessionId && workoutDetailHref(sessionId)}
              />
            );
          })}
        </div>
      </div>

    </div>
  );
}
