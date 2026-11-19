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

export const AUTH_CALLBACK_PATH = "/auth/callback";

/**
 * The providers the app has a button for. Adding one is a line here, its icon,
 * and switching it on in Supabase.
 */
export type SocialProvider = "google" | "apple";
export const SOCIAL_PROVIDERS: SocialProvider[] = ["google", "apple"];

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

/**
 * Starts signing in with a provider: the browser leaves for the provider's own screen and
 * comes back to `AUTH_CALLBACK_PATH`. Throws the Auth error if it can't start.
 */
export async function signInWithProvider(provider: SocialProvider): Promise<void> {
  const { error } = await createClient().auth.signInWithOAuth({ provider, options: { redirectTo: appUrl(AUTH_CALLBACK_PATH) } });
  if (error) throw error;
}

/**
 * Which of the app's providers are switched on in Supabase, from its public settings, so a
 * button never leads to an error page. Resolves to none if the settings can't be read: email
 * sign-in still works.
 */
export async function getEnabledSocialProviders(): Promise<SocialProvider[]> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "" },
    });
    if (!response.ok) return [];
    const { external } = (await response.json()) as { external?: Record<string, boolean> };
    return SOCIAL_PROVIDERS.filter((provider) => external?.[provider] === true);
  } catch (error) {
    console.error(error);
    return [];
  }
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

/** Calls back with the user whenever signing in or out (or a token refresh) happens. Returns how to stop listening. */
export function onAuthUserChange(callback: (user: User | null) => void): () => void {
  const { data } = createClient().auth.onAuthStateChange((_event, session) => callback(session?.user ?? null));
  return () => data.subscription.unsubscribe();
}

export async function signOut(): Promise<void> {
  const { error } = await createClient().auth.signOut();
  if (error) throw error;
}
