import { describe, it, expect, vi } from "vitest";

const getSession = vi.hoisted(() => vi.fn());
const getUser = vi.hoisted(() => vi.fn());
const signInWithPassword = vi.hoisted(() => vi.fn());
const signUpFn = vi.hoisted(() => vi.fn());
const signOutFn = vi.hoisted(() => vi.fn());
const resend = vi.hoisted(() => vi.fn());
const resetPasswordForEmail = vi.hoisted(() => vi.fn());
const updateUser = vi.hoisted(() => vi.fn());
const unsubscribe = vi.hoisted(() => vi.fn());
const onAuthStateChange = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase", () => ({
  createClient: () => ({ auth: { getSession, getUser, signInWithPassword, signUp: signUpFn, signOut: signOutFn, resend, resetPasswordForEmail, updateUser, onAuthStateChange } }),
}));

import { getSignedInUser, signIn, signUp, signOut, resendConfirmation, sendPasswordReset, updatePassword, onSignedInChange } from "@/lib/auth";

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
    signUpFn.mockResolvedValue({ data: { session: {} }, error: null });
    signOutFn.mockResolvedValue({ error: null });
    await signIn("a@b.c", "pw");
    await signUp("a@b.c", "pw");
    await signOut();
    expect(signInWithPassword).toHaveBeenCalledWith({ email: "a@b.c", password: "pw" });
    expect(signUpFn).toHaveBeenCalledWith({ email: "a@b.c", password: "pw", options: { emailRedirectTo: `${window.location.origin}/` } });
  });

  it("throw the Auth error so the caller can show its message", async () => {
    signInWithPassword.mockResolvedValue({ error: new Error("Invalid login credentials") });
    await expect(signIn("a@b.c", "bad")).rejects.toThrow("Invalid login credentials");
    signOutFn.mockResolvedValue({ error: new Error("offline") });
    await expect(signOut()).rejects.toThrow("offline");
  });
});

describe("signUp — email confirmation", () => {
  it("says a confirmation is needed when sign-up gives no session", async () => {
    signUpFn.mockResolvedValue({ data: { session: null }, error: null });
    expect(await signUp("a@b.c", "password1")).toEqual({ confirmationNeeded: true });
  });

  it("says none is needed when sign-up signs the person straight in", async () => {
    signUpFn.mockResolvedValue({ data: { session: { access_token: "t" } }, error: null });
    expect(await signUp("a@b.c", "password1")).toEqual({ confirmationNeeded: false });
  });

  it("throws the Auth error, e.g. a weak password", async () => {
    signUpFn.mockResolvedValue({ data: { session: null }, error: Object.assign(new Error("too short"), { code: "weak_password" }) });
    await expect(signUp("a@b.c", "x")).rejects.toThrow("too short");
  });
});

describe("resendConfirmation / sendPasswordReset / updatePassword", () => {
  it("resends the confirmation email, coming back to the app", async () => {
    resend.mockResolvedValue({ error: null });
    await resendConfirmation("a@b.c");
    expect(resend).toHaveBeenCalledWith({ type: "signup", email: "a@b.c", options: { emailRedirectTo: `${window.location.origin}/` } });
  });

  it("emails a reset link that opens the new-password page", async () => {
    resetPasswordForEmail.mockResolvedValue({ error: null });
    await sendPasswordReset("a@b.c");
    expect(resetPasswordForEmail).toHaveBeenCalledWith("a@b.c", { redirectTo: `${window.location.origin}/auth/reset` });
  });

  it("sets the new password", async () => {
    updateUser.mockResolvedValue({ error: null });
    await updatePassword("newpassword1");
    expect(updateUser).toHaveBeenCalledWith({ password: "newpassword1" });
  });

  it("throw the Auth error on failure", async () => {
    resend.mockResolvedValue({ error: new Error("rate limited") });
    resetPasswordForEmail.mockResolvedValue({ error: new Error("rate limited") });
    updateUser.mockResolvedValue({ error: new Error("same password") });
    await expect(resendConfirmation("a@b.c")).rejects.toThrow("rate limited");
    await expect(sendPasswordReset("a@b.c")).rejects.toThrow("rate limited");
    await expect(updatePassword("x")).rejects.toThrow("same password");
  });
});

describe("onSignedInChange", () => {
  it("reports whether someone is signed in whenever it changes, and can stop listening", () => {
    let listener: (event: string, session: unknown) => void = () => {};
    onAuthStateChange.mockImplementation((cb) => { listener = cb; return { data: { subscription: { unsubscribe } } }; });
    const seen: boolean[] = [];
    const stop = onSignedInChange((signedIn) => seen.push(signedIn));

    listener("SIGNED_IN", { user: {} });
    listener("SIGNED_OUT", null);
    expect(seen).toEqual([true, false]);

    stop();
    expect(unsubscribe).toHaveBeenCalled();
  });
});
