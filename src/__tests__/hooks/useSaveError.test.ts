import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSaveError } from "@/hooks/useSaveError";

describe("useSaveError", () => {
  it("resolves true and shows nothing when the save succeeds", async () => {
    const { result } = renderHook(() => useSaveError());
    let ok = false;
    await act(async () => { ok = await result.current.attempt(() => Promise.resolve(), "failed"); });
    expect(ok).toBe(true);
    expect(result.current.message).toBeNull();
  });

  it("resolves false and shows the message when the save throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { result } = renderHook(() => useSaveError());
    let ok = true;
    await act(async () => { ok = await result.current.attempt(() => Promise.reject(new Error("x")), "Couldn't save"); });
    expect(ok).toBe(false);
    expect(result.current.message).toBe("Couldn't save");
  });

  it("clears the message", async () => {
    const { result } = renderHook(() => useSaveError());
    act(() => result.current.report("oops"));
    expect(result.current.message).toBe("oops");
    act(() => result.current.clear());
    expect(result.current.message).toBeNull();
  });
});
