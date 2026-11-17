import { useEffect, useState } from "react";
import { getSignedInUser, onSignedInChange } from "@/lib/auth";

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
  const [status, setStatus] = useState<LinkStatus>("checking");

  useEffect(() => {
    const ready = () => setStatus("ready");
    const stop = onSignedInChange((signedIn) => { if (signedIn) ready(); });
    getSignedInUser().then((user) => { if (user) ready(); }).catch((error) => console.error(error));
    const timer = setTimeout(() => setStatus((s) => (s === "ready" ? s : "invalid")), LINK_WAIT_MS);
    return () => { stop(); clearTimeout(timer); };
  }, []);

  return status;
}
