"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSignedInUser, onSignedInChange, updatePassword } from "@/lib/auth";
import { authErrorMessage } from "@/lib/auth-errors";
import { SIGN_IN_PATH } from "@/lib/require-user";
import PasswordField from "@/components/auth/PasswordField";
import { MIN_PASSWORD_LENGTH } from "@/components/auth/CredentialsForm";
import FullScreenMessage from "@/components/FullScreenMessage";

type LinkStatus = "checking" | "ready" | "invalid";

/** How long to wait for the emailed link to sign the person in before calling it unusable. */
const LINK_WAIT_MS = 4000;

/**
 * Opening the reset link in the email signs the person in; this waits for that.
 * A link opened in another browser than the one that asked for it can't sign in,
 * and neither can an expired one.
 */
function useResetLink(): LinkStatus {
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

export default function ResetPasswordPage() {
  const router = useRouter();
  const status = useResetLink();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = password.length >= MIN_PASSWORD_LENGTH && !busy;

  if (status === "checking") return <FullScreenMessage message="Checking your link…" />;

  if (status === "invalid") {
    return (
      <div className="w-full min-h-screen max-w-sm mx-auto flex flex-col justify-center gap-5 p-4 text-center">
        <h1 className="font-display text-3xl font-bold text-fg leading-tight">This link didn&apos;t work</h1>
        <p className="text-sm text-muted leading-relaxed">
          It may have expired, or been opened in a different browser than the one you asked from. Request a new one from the sign-in page.
        </p>
        <Link href={SIGN_IN_PATH} className="btn-primary gloss font-display font-bold text-lg py-4 rounded-2xl">
          Back to sign in
        </Link>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setBusy(true);
    setError(null);
    try {
      await updatePassword(password);
      router.replace("/");
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} aria-label="Choose a new password" className="w-full min-h-screen max-w-sm mx-auto flex flex-col justify-center gap-5 p-4">
      <h1 className="font-display text-3xl font-bold text-fg leading-tight">Choose a new password</h1>
      <PasswordField label="New password" value={password} onChange={setPassword} autoComplete="new-password" hint={`At least ${MIN_PASSWORD_LENGTH} characters`} />
      {error && <p role="alert" className="text-sm text-danger bg-danger/10 px-3 py-2 rounded-lg">{error}</p>}
      <button type="submit" disabled={!ready} className="btn-primary gloss w-full font-display font-bold text-lg py-4 rounded-2xl cursor-pointer disabled:opacity-60">
        {busy ? "Saving…" : "Save password"}
      </button>
    </form>
  );
}
