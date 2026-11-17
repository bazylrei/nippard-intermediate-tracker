import { describe, it, expect, vi, afterEach } from "vitest";

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
const signInWithOAuth = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase", () => ({
  createClient: () => ({ auth: { getSession, getUser, signInWithPassword, signUp: signUpFn, signOut: signOutFn, resend, resetPasswordForEmail, updateUser, onAuthStateChange, signInWithOAuth } }),
}));

import { getSignedInUser, signIn, signUp, signOut, resendConfirmation, sendPasswordReset, updatePassword, onSignedInChange, signInWithProvider, getEnabledSocialProviders } from "@/lib/auth";

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

describe("signInWithProvider", () => {
  it("sends the browser to the provider, coming back to the callback page", async () => {
    signInWithOAuth.mockResolvedValue({ error: null });
    await signInWithProvider("google");
    expect(signInWithOAuth).toHaveBeenCalledWith({ provider: "google", options: { redirectTo: `${window.location.origin}/auth/callback` } });
  });

  it("throws the Auth error when it can't start", async () => {
    signInWithOAuth.mockResolvedValue({ error: new Error("provider is not enabled") });
    await expect(signInWithProvider("google")).rejects.toThrow("provider is not enabled");
  });
});

describe("getEnabledSocialProviders", () => {
  const settings = (external: Record<string, boolean>, ok = true) =>
    vi.fn().mockResolvedValue({ ok, json: async () => ({ external }) });
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

  it("lists the providers switched on in Supabase that the app has a button for", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    const fetchMock = settings({ email: true, google: true, apple: true });
    vi.stubGlobal("fetch", fetchMock);

    expect(await getEnabledSocialProviders()).toEqual(["google"]); // Apple is on, but the app has no button yet
    expect(fetchMock).toHaveBeenCalledWith("https://example.supabase.co/auth/v1/settings", { headers: { apikey: "anon-key" } });
  });

  it("lists none while Google is off, so no button leads to an error page", async () => {
    vi.stubGlobal("fetch", settings({ email: true, google: false }));
    expect(await getEnabledSocialProviders()).toEqual([]);
  });

  it("lists none, and doesn't throw, when the settings can't be read", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", settings({ google: true }, false));
    expect(await getEnabledSocialProviders()).toEqual([]);

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(await getEnabledSocialProviders()).toEqual([]);
  });
});
