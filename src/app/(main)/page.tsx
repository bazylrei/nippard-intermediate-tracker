"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { getNextSession, getIncompleteSession, getPreferences, upsertPreferences } from "@/lib/db";
import { DAY_LABELS, getSessionNumber, getTotalSessions } from "@/lib/program-data";
import { useProgramContext } from "@/context/ProgramContext";
import type { UserPreferences } from "@/lib/types";
import { cacheGet, cacheSet } from "@/lib/cache";
import { Dumbbell, Play, LogOut, Settings, ChevronRight } from "lucide-react";

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
      <div className="min-h-screen flex items-center justify-center text-muted text-sm font-display">
        Loading…
      </div>
    );
  }

  const nextDay = nextSession ? program.find((w) => w.week === nextSession.week)?.days[nextSession.dayIndex] : null;
  const sessionNum = nextSession ? getSessionNumber(nextSession.week, nextSession.dayIndex) : 1;
  const totalSessions = getTotalSessions();
  const progressPct = Math.round(((sessionNum - 1) / totalSessions) * 100);
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
            <h1 className="font-display font-bold text-base tracking-wide text-fg leading-tight">Nippard Intermediate</h1>
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

      {/* Settings panel */}
      {showSettings && (
        <div className="glass gloss rounded-2xl p-4 space-y-3">
          <h3 className="font-display font-semibold text-xs uppercase tracking-widest text-muted">Settings</h3>
          <div className="flex items-center justify-between">
            <span className="text-sm text-fg">Weight unit</span>
            <button
              onClick={toggleUnit}
              className="glass gloss font-display font-bold text-sm px-4 py-1.5 rounded-lg transition-colors cursor-pointer text-fg"
            >
              {prefs.unit.toUpperCase()}
            </button>
          </div>
        </div>
      )}

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
          <span>Week 12</span>
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
              {DAY_LABELS[nextDay.dayType]}
            </h2>
            <p className="text-sm text-muted mt-0.5">Week {nextSession.week} of 12</p>
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
            const isNext = i === nextSession?.dayIndex;
            const isDone = nextSession ? i < nextSession.dayIndex : false;
            return (
              <div
                key={i}
                className={`glass gloss rounded-2xl p-4 transition-opacity ${isDone ? "opacity-50" : ""}`}
                style={isNext ? { borderColor: "color-mix(in srgb, var(--primary) 35%, transparent)" } : {}}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-display font-bold text-xs ${
                    isDone
                      ? "bg-accent/20 text-accent"
                      : isNext
                      ? "bg-primary/20 text-primary"
                      : "text-muted"
                  }`} style={!isDone && !isNext ? { background: "color-mix(in srgb, var(--fg) 8%, transparent)" } : {}}>
                    {isDone ? "✓" : i + 1}
                  </span>
                  {isNext && <ChevronRight size={14} className="text-primary" />}
                </div>
                <p className={`font-display font-semibold text-sm leading-tight ${isNext ? "text-fg" : "text-muted"}`}>
                  {DAY_LABELS[day.dayType]}
                </p>
                <p className="text-xs text-subtle mt-0.5">{day.exercises.length} exercises</p>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
