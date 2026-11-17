"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSignedInUser } from "@/lib/auth";
import { checkOnboarded, ONBOARDING_PATH } from "@/lib/onboarding";

/**
 * Sends an account that hasn't finished onboarding to it, from anywhere in the app.
 * It doesn't hold the page back: a returning user sees no delay, and a failed
 * check just leaves them in the app rather than locking them out.
 */
export default function OnboardingGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    async function check() {
      const user = await getSignedInUser();
      if (!user) return; // each page already sends a signed-out visitor to sign in
      const done = await checkOnboarded(user.id);
      if (!done && !cancelled) router.replace(ONBOARDING_PATH);
    }
    check().catch((error) => console.error(error));
    return () => { cancelled = true; };
  }, [router]);

  return <>{children}</>;
}
