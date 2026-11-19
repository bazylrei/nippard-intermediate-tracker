"use client";

import { useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { providerReturnError } from "@/lib/auth-errors";
import { SIGN_IN_PATH } from "@/lib/auth-paths";
import { useLinkSession } from "@/hooks/useLinkSession";
import FullScreenMessage from "@/components/FullScreenMessage";

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

  return (
    <div className="w-full min-h-screen max-w-sm mx-auto flex flex-col justify-center gap-5 p-4 text-center">
      <h1 className="font-display text-3xl font-bold text-fg leading-tight">Couldn&apos;t sign you in</h1>
      <p role="alert" className="text-sm text-muted leading-relaxed">{failure}</p>
      <Link href={SIGN_IN_PATH} className="btn-primary gloss font-display font-bold text-lg py-4 rounded-2xl">
        Back to sign in
      </Link>
    </div>
  );
}
