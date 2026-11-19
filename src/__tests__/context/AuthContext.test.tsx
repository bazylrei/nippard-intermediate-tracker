import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import type { User } from "@supabase/supabase-js";

const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const auth = vi.hoisted(() => ({ getSignedInUser: vi.fn(), onAuthUserChange: vi.fn() }));
vi.mock("@/lib/auth", () => auth);

import { AuthProvider, useAuth, useRequireUser } from "@/context/AuthContext";

const user = (id: string) => ({ id }) as User;
let emit: (u: User | null) => void;
const stop = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  auth.getSignedInUser.mockResolvedValue(user("u1"));
  auth.onAuthUserChange.mockImplementation((cb: (u: User | null) => void) => { emit = cb; return stop; });
});

describe("AuthProvider", () => {
  it("is loading until the stored session has been read", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.status).toBe("signedIn"));
    expect(result.current.user?.id).toBe("u1");
  });

  it("reads the session once, however many components ask", async () => {
    const { result } = renderHook(() => ({ a: useAuth(), b: useAuth() }), { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.a.status).toBe("signedIn"));
    expect(auth.getSignedInUser).toHaveBeenCalledTimes(1);
  });

  it("is signed out when there is no session", async () => {
    auth.getSignedInUser.mockResolvedValue(null);
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.status).toBe("signedOut"));
  });

  it("is signed out, not stuck loading, when the session can't be read", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    auth.getSignedInUser.mockRejectedValue(new Error("storage blocked"));
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.status).toBe("signedOut"));
  });

  it("follows sign-out and a switch to another account", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.status).toBe("signedIn"));
    act(() => emit(null));
    expect(result.current.status).toBe("signedOut");
    act(() => emit(user("u2")));
    expect(result.current.user?.id).toBe("u2");
  });

  it("keeps the same state when a token refresh reports the same user", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.status).toBe("signedIn"));
    const before = result.current;
    act(() => emit(user("u1")));
    expect(result.current).toBe(before);
  });

  it("stops listening when it unmounts", async () => {
    const { unmount } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    unmount();
    expect(stop).toHaveBeenCalled();
  });
});

describe("useRequireUser", () => {
  it("returns the user and leaves the page alone when signed in", async () => {
    const { result } = renderHook(() => useRequireUser(), { wrapper: AuthProvider });
    await waitFor(() => expect(result.current?.id).toBe("u1"));
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("doesn't redirect while the session is still being read", () => {
    renderHook(() => useRequireUser(), { wrapper: AuthProvider });
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("sends a signed-out visitor to sign in", async () => {
    auth.getSignedInUser.mockResolvedValue(null);
    const { result } = renderHook(() => useRequireUser(), { wrapper: AuthProvider });
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/auth"));
    expect(result.current).toBeNull();
  });
});
