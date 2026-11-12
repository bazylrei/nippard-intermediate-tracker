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
