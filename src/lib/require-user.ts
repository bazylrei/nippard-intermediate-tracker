import type { User } from "@supabase/supabase-js";
import { getSignedInUser } from "./auth";

export const SIGN_IN_PATH = "/auth";

/**
 * The signed-in user — or null, after sending the visitor to sign in.
 * Callers just `if (!user) return;`.
 */
export async function requireSignedInUser(router: { replace: (href: string) => void }): Promise<User | null> {
  const user = await getSignedInUser();
  if (!user) router.replace(SIGN_IN_PATH);
  return user;
}
