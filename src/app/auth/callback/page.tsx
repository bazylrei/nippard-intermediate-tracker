"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { providerReturnError } from "@/lib/auth-errors";
import { useLinkSession } from "@/hooks/useLinkSession";
import FullScreenMessage from "@/components/widgets/FullScreenMessage";
import SignInFailed from "@/components/auth/SignInFailed";

const HOME = "/";
const GENERIC = "Couldn't sign you in. Try again, or use your email instead.";

/** The address never changes while this page is open, so there's nothing to subscribe to. */
const noSubscription = () => () => {};

/**
 * Where a provider (Google) sends the person back. The app's own client turns the return
 * into a session; this waits for it and goes Home (a new account is then taken through
 * onboarding), or explains why sign-in didn't complete.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const status = useLinkSession();
  // Read from the browser's address; empty while rendering on the server.
  const search = useSyncExternalStore(noSubscription, () => window.location.search, () => "");
  const hash = useSyncExternalStore(noSubscription, () => window.location.hash, () => "");
  const providerError = providerReturnError({ search, hash });
  const failure = providerError ?? (status === "invalid" ? GENERIC : null);

  useEffect(() => {
    if (status === "ready" && !providerError) router.replace(HOME);
  }, [status, providerError, router]);

  if (!failure) return <FullScreenMessage message="Signing you in…" />;

  return <SignInFailed reason={failure} />;
}
