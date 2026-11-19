import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { createElement } from "react";
import type { User } from "@supabase/supabase-js";
import { AuthContext, type AuthState } from "@/context/AuthContext";
import type { UserPreferences } from "@/lib/types";

const db = vi.hoisted(() => ({ getPreferences: vi.fn(), upsertPreferences: vi.fn() }));
vi.mock("@/lib/db", () => db);

import { PreferencesProvider, usePreferences } from "@/context/PreferencesContext";
import { useWeightUnit } from "@/hooks/useWeightUnit";
import { useWorkoutPrefs } from "@/hooks/useWorkoutPrefs";
import { DEFAULT_PREFS, readCachedPrefs } from "@/lib/prefs-cache";

const loaded: UserPreferences = { ...DEFAULT_PREFS, unit: "lbs", weekStartsOn: 0 };
const signedIn = (id: string): AuthState => ({ status: "signedIn", user: { id } as User });
const SIGNED_OUT: AuthState = { status: "signedOut", user: null };

function setup(auth: AuthState = signedIn("u1")) {
  let current = auth;
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    createElement(AuthContext.Provider, { value: current }, createElement(PreferencesProvider, null, children));
  const hook = renderHook(() => usePreferences(), { wrapper });
  return { ...hook, signInAs: (next: AuthState) => { current = next; hook.rerender(); } };
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  db.getPreferences.mockResolvedValue(loaded);
  db.upsertPreferences.mockResolvedValue(undefined);
});

describe("loading", () => {
  it("shows the device's cached preferences at once, then the account's", async () => {
    localStorage.setItem("workout_cache_prefs", JSON.stringify({ ...DEFAULT_PREFS, unit: "lbs" }));
    const { result } = setup();
    expect(result.current.prefs.unit).toBe("lbs");
    expect(result.current.ready).toBe(false);
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.prefs).toEqual(loaded);
    expect(readCachedPrefs()).toEqual(loaded);
  });

  it("loads once, however many components use it", async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(db.getPreferences).toHaveBeenCalledTimes(1);
    expect(db.getPreferences).toHaveBeenCalledWith("u1");
  });

  it("is the one load behind every hook that reads preferences", async () => {
    const auth = signedIn("u1");
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      createElement(AuthContext.Provider, { value: auth }, createElement(PreferencesProvider, null, children));
    const { result } = renderHook(() => ({ unit: useWeightUnit(), workout: useWorkoutPrefs(), provider: usePreferences() }), { wrapper });
    await waitFor(() => expect(result.current.provider.ready).toBe(true));
    expect(result.current.unit).toBe("lbs");
    expect(result.current.workout.prefs).toBe(result.current.provider.prefs);
    expect(db.getPreferences).toHaveBeenCalledTimes(1);
  });

  it("loads nothing for a signed-out visitor", () => {
    const { result } = setup(SIGNED_OUT);
    expect(db.getPreferences).not.toHaveBeenCalled();
    expect(result.current.ready).toBe(false);
  });

  it("reloads for the next account after a switch", async () => {
    const { result, signInAs } = setup();
    await waitFor(() => expect(result.current.ready).toBe(true));
    db.getPreferences.mockResolvedValue({ ...DEFAULT_PREFS, unit: "kg", weekStartsOn: 3 });
    signInAs(signedIn("u2"));
    await waitFor(() => expect(result.current.prefs.weekStartsOn).toBe(3));
    expect(db.getPreferences).toHaveBeenLastCalledWith("u2");
  });

  it("reports failure, keeping the cached copy", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    db.getPreferences.mockRejectedValue(new Error("offline"));
    const { result } = setup();
    await waitFor(() => expect(result.current.failed).toBe(true));
    expect(result.current.ready).toBe(false);
    expect(result.current.prefs).toEqual(DEFAULT_PREFS);
  });
});

describe("save", () => {
  it("shows the change at once, saves only what changed, and caches it", async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.ready).toBe(true));
    let saving!: Promise<void>;
    act(() => { saving = result.current.save({ heightCm: 180 }); });
    expect(result.current.prefs.heightCm).toBe(180);
    await act(async () => { await saving; });
    expect(db.upsertPreferences).toHaveBeenCalledWith("u1", { heightCm: 180 });
    expect(readCachedPrefs()?.heightCm).toBe(180);
  });

  it("puts back only the changed fields and rejects when saving fails", async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.ready).toBe(true));
    db.upsertPreferences.mockRejectedValueOnce(new Error("offline"));
    await act(async () => { await expect(result.current.save({ unit: "kg" })).rejects.toThrow("offline"); });
    expect(result.current.prefs.unit).toBe("lbs");
    expect(readCachedPrefs()?.unit).toBe("lbs");
  });

  it("keeps another save's result when an earlier one fails", async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.ready).toBe(true));
    let failFirst!: (e: Error) => void;
    db.upsertPreferences
      .mockImplementationOnce(() => new Promise((_, reject) => { failFirst = reject; }))
      .mockResolvedValueOnce(undefined);
    let first!: Promise<void>;
    act(() => { first = result.current.save({ unit: "kg" }); });
    await act(async () => { await result.current.save({ heightCm: 175 }); });
    await act(async () => { failFirst(new Error("offline")); await first.catch(() => {}); });
    expect(result.current.prefs).toMatchObject({ unit: "lbs", heightCm: 175 });
  });

  it("isn't overwritten by a load that finishes after it", async () => {
    let finishLoad!: (p: UserPreferences) => void;
    db.getPreferences.mockReturnValue(new Promise((resolve) => { finishLoad = resolve; }));
    const { result } = setup();
    await act(async () => { await result.current.save({ unit: "kg" }); });
    await act(async () => { finishLoad(loaded); });
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.prefs.unit).toBe("kg");
  });

  it("rejects when nobody is signed in", async () => {
    const { result } = setup(SIGNED_OUT);
    await expect(result.current.save({ unit: "kg" })).rejects.toThrow("Not signed in");
    expect(db.upsertPreferences).not.toHaveBeenCalled();
  });
});
