"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { checkOnboarded, ONBOARDING_PATH } from "@/lib/onboarding";

/**
 * Sends an account that hasn't finished onboarding to it, from anywhere in the app.
 * It doesn't hold the page back: a returning user sees no delay, and a failed
 * check just leaves them in the app rather than locking them out.
 */
export default function OnboardingGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user } = useAuth(); // a signed-out visitor is left to each page, which sends them to sign in
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    checkOnboarded(userId)
      .then((done) => { if (!done && !cancelled) router.replace(ONBOARDING_PATH); })
      .catch((error) => console.error(error));
    return () => { cancelled = true; };
  }, [userId, router]);

  return <>{children}</>;
}
