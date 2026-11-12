import { describe, it, expect, vi } from "vitest";

const getSession = vi.hoisted(() => vi.fn());
const getUser = vi.hoisted(() => vi.fn());
const signInWithPassword = vi.hoisted(() => vi.fn());
const signUpFn = vi.hoisted(() => vi.fn());
const signOutFn = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase", () => ({
  createClient: () => ({ auth: { getSession, getUser, signInWithPassword, signUp: signUpFn, signOut: signOutFn } }),
}));

import { getSignedInUser, signIn, signUp, signOut } from "@/lib/auth";

describe("getSignedInUser", () => {
  it("returns the user from the local session without calling the Auth server", async () => {
    getSession.mockResolvedValue({ data: { session: { user: { id: "user-1" } } } });
    expect(await getSignedInUser()).toEqual({ id: "user-1" });
    expect(getUser).not.toHaveBeenCalled();
  });

  it("returns null when there is no session", async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    expect(await getSignedInUser()).toBeNull();
  });
});

describe("signIn / signUp / signOut", () => {
  it("pass credentials through and resolve on success", async () => {
    signInWithPassword.mockResolvedValue({ error: null });
    signUpFn.mockResolvedValue({ error: null });
    signOutFn.mockResolvedValue({ error: null });
    await signIn("a@b.c", "pw");
    await signUp("a@b.c", "pw");
    await signOut();
    expect(signInWithPassword).toHaveBeenCalledWith({ email: "a@b.c", password: "pw" });
    expect(signUpFn).toHaveBeenCalledWith({ email: "a@b.c", password: "pw" });
  });

  it("throw the Auth error so the caller can show its message", async () => {
    signInWithPassword.mockResolvedValue({ error: new Error("Invalid login credentials") });
    await expect(signIn("a@b.c", "bad")).rejects.toThrow("Invalid login credentials");
    signOutFn.mockResolvedValue({ error: new Error("offline") });
    await expect(signOut()).rejects.toThrow("offline");
  });
});
