import type { User } from "@supabase/supabase-js";
import { createClient } from "./supabase";

/**
 * The signed-in user from the locally stored session — no network call unless
 * the token needs refreshing. Safe for client-side routing decisions because
 * every query is still authorised server-side by RLS against the JWT.
 * (`auth.getUser()` costs a round trip to the Auth server on every page load.)
 */
export async function getSignedInUser(): Promise<User | null> {
  const { data } = await createClient().auth.getSession();
  return data.session?.user ?? null;
}

/** Throws the Auth error (with its user-facing message) on failure. */
export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await createClient().auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export const RESET_PASSWORD_PATH = "/auth/reset";

/** An address in this app, for the links in emails to come back to. */
const appUrl = (path: string) => `${window.location.origin}${path}`;

/**
 * Creates the account. With email confirmation on, there's no session yet:
 * `confirmationNeeded` is true until the person opens the link we email them.
 * Throws the Auth error on failure.
 */
export async function signUp(email: string, password: string): Promise<{ confirmationNeeded: boolean }> {
  const { data, error } = await createClient().auth.signUp({ email, password, options: { emailRedirectTo: appUrl("/") } });
  if (error) throw error;
  return { confirmationNeeded: !data.session };
}

/** Sends the confirmation email again. Throws the Auth error on failure. */
export async function resendConfirmation(email: string): Promise<void> {
  const { error } = await createClient().auth.resend({ type: "signup", email, options: { emailRedirectTo: appUrl("/") } });
  if (error) throw error;
}

/** Emails a link to choose a new password, which opens `RESET_PASSWORD_PATH`. Throws the Auth error on failure. */
export async function sendPasswordReset(email: string): Promise<void> {
  const { error } = await createClient().auth.resetPasswordForEmail(email, { redirectTo: appUrl(RESET_PASSWORD_PATH) });
  if (error) throw error;
}

/** Sets a new password for the signed-in (or link-recovered) user. Throws the Auth error on failure. */
export async function updatePassword(password: string): Promise<void> {
  const { error } = await createClient().auth.updateUser({ password });
  if (error) throw error;
}

/** Calls back whenever signing in or out happens, e.g. when a link in an email signs the person in. Returns how to stop listening. */
export function onSignedInChange(callback: (signedIn: boolean) => void): () => void {
  const { data } = createClient().auth.onAuthStateChange((_event, session) => callback(!!session));
  return () => data.subscription.unsubscribe();
}

export async function signOut(): Promise<void> {
  const { error } = await createClient().auth.signOut();
  if (error) throw error;
}
