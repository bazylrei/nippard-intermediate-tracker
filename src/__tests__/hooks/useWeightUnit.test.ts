import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { cacheGet, cacheSet } from "@/lib/cache";

const auth = vi.hoisted(() => ({ getSignedInUser: vi.fn() }));
vi.mock("@/lib/auth", () => auth);
const db = vi.hoisted(() => ({ getPreferences: vi.fn() }));
vi.mock("@/lib/db", () => db);

import { useWeightUnit } from "@/hooks/useWeightUnit";

const prefs = (unit: "kg" | "lbs") => ({ unit, alternateSelections: {}, exerciseNotes: {} });

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  auth.getSignedInUser.mockResolvedValue({ id: "user-1" });
});

describe("useWeightUnit", () => {
  it("defaults to kg, then adopts and caches the saved preference", async () => {
    db.getPreferences.mockResolvedValue(prefs("lbs"));
    const { result } = renderHook(() => useWeightUnit());
    expect(result.current).toBe("kg");
    await waitFor(() => expect(result.current).toBe("lbs"));
    expect(cacheGet<{ unit: string }>("prefs")?.unit).toBe("lbs");
  });

  it("starts from the cached unit and keeps it if the refresh fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    cacheSet("prefs", prefs("lbs"));
    db.getPreferences.mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => useWeightUnit());
    expect(result.current).toBe("lbs");
    await waitFor(() => expect(console.error).toHaveBeenCalled());
    expect(result.current).toBe("lbs");
  });

  it("doesn't query preferences when signed out", async () => {
    auth.getSignedInUser.mockResolvedValue(null);
    renderHook(() => useWeightUnit());
    await waitFor(() => expect(auth.getSignedInUser).toHaveBeenCalled());
    expect(db.getPreferences).not.toHaveBeenCalled();
  });
});
