"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSignedInUser, signOut } from "@/lib/auth";
import { ACTIVE_PROGRAM_NAME } from "@/lib/program-db";
import { getCompletedSlots, getIncompleteSession, getPreferences, upsertPreferences, type CompletedSlot } from "@/lib/db";
import { dayLabel } from "@/lib/day-types";
import { getSessionNumber, getTotalSessions, nextWorkout } from "@/lib/program-data";
import { useProgramContext } from "@/context/ProgramContext";
import type { UserPreferences, WorkoutPosition } from "@/lib/types";
import { latestSessionBySlot, workoutDetailHref } from "@/lib/workout-history";
import WeekDayTile from "@/components/program/WeekDayTile";
import SettingsPanel from "@/components/program/SettingsPanel";
import SaveErrorAlert from "@/components/workout/SaveErrorAlert";
import { useSaveError } from "@/hooks/useSaveError";
import FullScreenMessage from "@/components/workout/FullScreenMessage";
import { cacheGet, cacheSet } from "@/lib/cache";
import { Dumbbell, Play, LogOut, Settings } from "lucide-react";

const CACHE_KEY = "dashboard-v3";

type CachedDashboard = {
  resume: WorkoutPosition | null;
  /** Newest first; the first entry is the last completed workout. */
  completed: CompletedSlot[];
  prefs: UserPreferences;
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
  const [prefs, setPrefs] = useState<UserPreferences>(cached?.prefs ?? { unit: "kg", alternateSelections: {}, exerciseNotes: {} });
  const [showSettings, setShowSettings] = useState(false);
  const saveError = useSaveError();

  useEffect(() => {
    async function init() {
      const user = await getSignedInUser();
      if (!user) { router.replace("/auth"); return; }
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
      cacheSet(CACHE_KEY, { resume: resumeAt, completed: slots, prefs: p, email: resolvedEmail });
      cacheSet("prefs", p);
      setLoading(false);
    }
    void init();
  }, [router]);

  async function handleSignOut() {
    if (await saveError.attempt(signOut, "Couldn't sign out. Try again.")) router.replace("/auth");
  }

  function applyPrefs(next: UserPreferences) {
    setPrefs(next);
    cacheSet(CACHE_KEY, { resume, completed, prefs: next, email });
    cacheSet("prefs", next);
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

  function startWorkout() {
    if (!nextSession) return;
    router.push(`/workout?week=${nextSession.week}&day=${nextSession.dayIndex}`);
  }

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

      {/* Next workout hero */}
      {nextSession && nextDay && (
        <div className="glass gloss rounded-2xl overflow-hidden">
          <div className="px-5 pt-4 pb-0 flex items-center justify-between">
            <span className="font-display font-bold text-xs uppercase tracking-widest text-primary">
              {hasResume ? "Resume Workout" : "Next Up"}
            </span>
            <span className="font-display font-bold text-xs text-muted">Session {sessionNum}</span>
          </div>

          <div className="px-5 pt-2 pb-4 border-b" style={{ borderColor: "color-mix(in srgb, var(--fg) 7%, transparent)" }}>
            <h2 className="font-display font-bold text-3xl text-fg leading-tight">
              {dayLabel(nextDay.dayType)}
            </h2>
            <p className="text-sm text-muted mt-0.5">Week {nextSession.week} of {totalWeeks}</p>
          </div>

          <div className="px-5 py-3 space-y-1">
            {nextDay.exercises.slice(0, 5).map((ex, i) => (
              <div key={i} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-md flex items-center justify-center font-display font-bold text-xs text-muted shrink-0"
                    style={{ background: "color-mix(in srgb, var(--fg) 8%, transparent)" }}>
                    {i + 1}
                  </span>
                  <span className="text-sm text-fg">{ex.name}</span>
                </div>
                <span className="text-xs text-muted font-display">{ex.repRange[0]}–{ex.repRange[1]}</span>
              </div>
            ))}
            {nextDay.exercises.length > 5 && (
              <p className="text-xs text-subtle pt-0.5 pl-7">+{nextDay.exercises.length - 5} more</p>
            )}
          </div>

          <div className="px-5 pb-5 pt-2">
            <button
              onClick={startWorkout}
              className="gloss w-full flex items-center justify-center gap-2 text-primary-fg font-display font-bold text-lg py-4 rounded-2xl transition-opacity cursor-pointer hover:opacity-90"
              style={{
                background: "linear-gradient(170deg, color-mix(in srgb, var(--primary) 80%, white) 0%, var(--primary) 100%)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 20px color-mix(in srgb, var(--primary) 40%, transparent)",
              }}
            >
              <Play size={18} fill="currentColor" />
              {hasResume ? "Resume Workout" : "Start Workout"}
            </button>
          </div>
        </div>
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
