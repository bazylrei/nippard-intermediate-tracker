import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@/test-utils/render-with-prefs";

const auth = vi.hoisted(() => ({ onAuthUserChange: () => () => {}, getSignedInUser: vi.fn() }));
vi.mock("@/lib/auth", () => auth);
const db = vi.hoisted(() => ({ getPreferences: vi.fn(), getLatestBodyWeight: vi.fn(), logBodyWeight: vi.fn() }));
vi.mock("@/lib/db", () => db);

import { useWeighIn } from "@/hooks/useWeighIn";
import { localYmd } from "@/lib/dates";

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  auth.getSignedInUser.mockResolvedValue({ id: "user-1" });
  db.getPreferences.mockResolvedValue({ unit: "lbs", alternateSelections: {}, exerciseNotes: {}, weekStartsOn: 1 });
  db.getLatestBodyWeight.mockResolvedValue(null);
  db.logBodyWeight.mockResolvedValue(undefined);
});

describe("useWeighIn", () => {
  it("is due before the first weigh-in, in the user's unit", async () => {
    const { result } = renderHook(() => useWeighIn());
    await waitFor(() => expect(result.current.due).toBe(true));
    expect(result.current.unit).toBe("lbs");
  });

  it("isn't due when today's weigh-in exists", async () => {
    db.getLatestBodyWeight.mockResolvedValue({ loggedOn: localYmd(new Date()), weightKg: 80, source: "manual" });
    const { result } = renderHook(() => useWeighIn());
    await waitFor(() => expect(db.getLatestBodyWeight).toHaveBeenCalled());
    expect(result.current.due).toBe(false);
  });

  it("logs today's weight converted to kg, then hides the prompt", async () => {
    const { result } = renderHook(() => useWeighIn());
    await waitFor(() => expect(result.current.due).toBe(true));

    await act(() => result.current.save(176.37)); // lbs
    expect(db.logBodyWeight).toHaveBeenCalledWith("user-1", localYmd(new Date()), expect.closeTo(80, 2));
    expect(result.current.due).toBe(false);
  });

  it("keeps the prompt when saving fails, so the card can show the error", async () => {
    db.logBodyWeight.mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => useWeighIn());
    await waitFor(() => expect(result.current.due).toBe(true));

    await expect(act(() => result.current.save(80))).rejects.toThrow("offline");
    expect(result.current.due).toBe(true);
  });

  it("stays hidden when the check fails or nobody is signed in", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    db.getLatestBodyWeight.mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => useWeighIn());
    await waitFor(() => expect(console.error).toHaveBeenCalled());
    expect(result.current.due).toBe(false);
  });
});
