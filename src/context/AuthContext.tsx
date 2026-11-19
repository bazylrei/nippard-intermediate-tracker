"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { getSignedInUser, onAuthUserChange } from "@/lib/auth";
import { SIGN_IN_PATH } from "@/lib/auth-paths";

/** Who is signed in: unknown until the stored session has been read, then a user or nobody. */
export type AuthState =
  | { status: "loading"; user: null }
  | { status: "signedOut"; user: null }
  | { status: "signedIn"; user: User };

const LOADING: AuthState = { status: "loading", user: null };

export const AuthContext = createContext<AuthState>(LOADING);

/** Reads the stored session once and follows sign-in, sign-out and account switches after that. */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(LOADING);

  useEffect(() => {
    let cancelled = false;
    // Token refreshes report the same user again: keep the state (and every dependent effect) as it is.
    const apply = (user: User | null) => {
      if (cancelled) return;
      setState((prev) => {
        if (user) return prev.user?.id === user.id ? prev : { status: "signedIn", user };
        return prev.status === "signedOut" ? prev : { status: "signedOut", user: null };
      });
    };
    getSignedInUser().then(apply).catch((error) => { console.error(error); apply(null); });
    const stop = onAuthUserChange(apply);
    return () => { cancelled = true; stop(); };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}

/**
 * The signed-in user, or null while it's still being read — and after sending a
 * signed-out visitor to sign in. Callers just `if (!user) return;`.
 */
export function useRequireUser(): User | null {
  const router = useRouter();
  const { status, user } = useAuth();
  useEffect(() => {
    if (status === "signedOut") router.replace(SIGN_IN_PATH);
  }, [status, router]);
  return user;
}
