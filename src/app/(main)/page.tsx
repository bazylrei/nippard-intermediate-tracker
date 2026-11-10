"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { getNextSession, getIncompleteSession, getPreferences, upsertPreferences } from "@/lib/db";
import { DAY_LABELS, getSessionNumber, getTotalSessions } from "@/lib/program-data";
import { useProgramContext } from "@/context/ProgramContext";
import type { UserPreferences } from "@/lib/types";
import { cacheGet, cacheSet } from "@/lib/cache";
import { Dumbbell, Play, LogOut, Settings } from "lucide-react";

type CachedDashboard = {
  nextSession: { week: number; dayIndex: number };
  hasResume: boolean;
  prefs: UserPreferences;
  email: string;
};

export default function Dashboard() {
  const router = useRouter();
  const { program, ready: programReady } = useProgramContext();
  const cached = cacheGet<CachedDashboard>("dashboard");
  const [loading, setLoading] = useState(!cached);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState(cached?.email ?? "");
  const [nextSession, setNextSession] = useState<{ week: number; dayIndex: number } | null>(cached?.nextSession ?? null);
  const [hasResume, setHasResume] = useState(cached?.hasResume ?? false);
  const [prefs, setPrefs] = useState<UserPreferences>(cached?.prefs ?? { unit: "kg", alternateSelections: {} });
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    async function init() {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) { router.replace("/auth"); return; }
      setUserId(user.id);

      const [incomplete, next, p] = await Promise.all([
        getIncompleteSession(user.id),
        getNextSession(user.id),
        getPreferences(user.id),
      ]);
      const resolvedNext = incomplete ? { week: incomplete.week, dayIndex: incomplete.dayIndex } : next;
      const resolvedEmail = user.email ?? "";
      setHasResume(!!incomplete);
      setNextSession(resolvedNext);
      setPrefs(p);
      setEmail(resolvedEmail);
      cacheSet("dashboard", { nextSession: resolvedNext, hasResume: !!incomplete, prefs: p, email: resolvedEmail });
      cacheSet("prefs", p);
      setLoading(false);
    }
    init();
  }, [router]);

  async function handleSignOut() {
    const sb = createClient();
    await sb.auth.signOut();
    router.replace("/auth");
  }

  async function toggleUnit() {
    if (!userId) return;
    const next: UserPreferences = { ...prefs, unit: prefs.unit === "kg" ? "lbs" : "kg" };
    setPrefs(next);
    if (nextSession) cacheSet("dashboard", { nextSession, hasResume, prefs: next, email });
    cacheSet("prefs", next);
    await upsertPreferences(userId, { unit: next.unit });
  }

  function startWorkout() {
    if (!nextSession) return;
    router.push(`/workout?week=${nextSession.week}&day=${nextSession.dayIndex}`);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-zinc-500">
        Loading...
      </div>
    );
  }

  const nextDay = nextSession ? program.find((w) => w.week === nextSession.week)?.days[nextSession.dayIndex] : null;
  const sessionNum = nextSession ? getSessionNumber(nextSession.week, nextSession.dayIndex) : 1;
  const totalSessions = getTotalSessions();
  const progressPct = Math.round(((sessionNum - 1) / totalSessions) * 100);

  return (
    <div className="min-h-screen max-w-lg md:max-w-2xl mx-auto flex flex-col p-4 md:p-8 gap-5">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2.5">
          <Dumbbell className="text-orange-400" size={24} />
          <div>
            <h1 className="text-base font-bold text-zinc-100">Nippard Intermediate</h1>
            <p className="text-xs text-zinc-500">{email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowSettings(!showSettings)} className="p-2 text-zinc-500 hover:text-zinc-200 transition-colors">
            <Settings size={18} />
          </button>
          <button onClick={handleSignOut} className="p-2 text-zinc-500 hover:text-zinc-200 transition-colors">
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="bg-zinc-900 rounded-2xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-zinc-300">Settings</h3>
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">Weight unit</span>
            <button
              onClick={toggleUnit}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
            >
              {prefs.unit.toUpperCase()}
            </button>
          </div>
        </div>
      )}

      {/* Program progress */}
      <div className="bg-zinc-900 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-400">Program Progress</span>
          <span className="text-zinc-300 font-medium">
            Session {Math.max(0, sessionNum - 1)} / {totalSessions}
          </span>
        </div>
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-orange-500 rounded-full transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-zinc-600">
          <span>Week 1</span>
          <span>{progressPct}% complete</span>
          <span>Week 12</span>
        </div>
      </div>

      {/* Next workout card */}
      {nextSession && nextDay && (
        <div className="bg-gradient-to-br from-orange-950/40 to-zinc-900 border border-orange-900/30 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-orange-400/80 font-medium uppercase tracking-wider">
                {hasResume ? "Resume Workout" : "Next Up"}
              </p>
              <h2 className="text-lg font-bold text-zinc-100 mt-0.5">
                Week {nextSession.week} · {DAY_LABELS[nextDay.dayType]}
              </h2>
            </div>
            <div className="text-right">
              <p className="text-xs text-zinc-500">Session</p>
              <p className="text-2xl font-bold text-orange-400">{sessionNum}</p>
            </div>
          </div>

          {/* Exercise preview */}
          <div className="space-y-1.5">
            {nextDay.exercises.slice(0, 4).map((ex, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-zinc-400">
                <div className="w-1 h-1 bg-zinc-600 rounded-full" />
                {ex.name}
                <span className="text-zinc-600 text-xs ml-auto">{ex.repRange[0]}–{ex.repRange[1]} reps</span>
              </div>
            ))}
            {nextDay.exercises.length > 4 && (
              <p className="text-xs text-zinc-600 pl-3">+{nextDay.exercises.length - 4} more exercises</p>
            )}
          </div>

          <button
            onClick={startWorkout}
            className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-400 text-white font-semibold py-3.5 rounded-xl transition-colors"
          >
            <Play size={18} fill="currentColor" />
            {hasResume ? "Resume Workout" : "Start Workout"}
          </button>
        </div>
      )}

      {/* Week overview */}
      <div className="bg-zinc-900 rounded-2xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-zinc-400">Week {nextSession?.week ?? 1} Overview</h3>
        <div className="space-y-1.5">
          {(program.find((w) => w.week === (nextSession?.week ?? 1))?.days ?? []).map((day, i) => {
            const isNext = i === nextSession?.dayIndex;
            const isDone = nextSession ? i < nextSession.dayIndex : false;
            return (
              <div
                key={i}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm ${
                  isNext ? "bg-orange-500/10 border border-orange-500/20" : isDone ? "opacity-50" : ""
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                    isDone ? "bg-green-800/60 text-green-400" : isNext ? "bg-orange-500/20 text-orange-400" : "bg-zinc-800 text-zinc-500"
                  }`}>
                    {isDone ? "✓" : i + 1}
                  </span>
                  <span className={isNext ? "text-zinc-200 font-medium" : "text-zinc-400"}>
                    {DAY_LABELS[day.dayType]}
                  </span>
                </div>
                <span className="text-zinc-600 text-xs">{day.exercises.length} exercises</span>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
