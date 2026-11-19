import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

export type LinkStatus = "checking" | "ready" | "invalid";

/** How long to wait for a link to sign the person in before calling it unusable. */
export const LINK_WAIT_MS = 4000;

/**
 * For pages a link lands on (an emailed reset link, a return from Google): waits for
 * that link to sign the person in. A link that can't (expired, used already, or opened in
 * another browser than the one that asked for it) is "invalid" after `LINK_WAIT_MS`, though a
 * slow one still goes through if it arrives later.
 */
export function useLinkSession(): LinkStatus {
  const signedIn = useAuth().status === "signedIn";
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), LINK_WAIT_MS);
    return () => clearTimeout(timer);
  }, []);

  // A slow link still goes through if it signs the person in after the wait.
  if (signedIn) return "ready";
  return timedOut ? "invalid" : "checking";
}
