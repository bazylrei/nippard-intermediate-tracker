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

/** Throws the Auth error (with its user-facing message) on failure. */
export async function signUp(email: string, password: string): Promise<void> {
  const { error } = await createClient().auth.signUp({ email, password });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const { error } = await createClient().auth.signOut();
  if (error) throw error;
}
