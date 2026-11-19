"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updatePassword } from "@/lib/auth";
import { authErrorMessage } from "@/lib/auth-errors";
import { SIGN_IN_PATH } from "@/lib/auth-paths";
import PasswordField from "@/components/auth/PasswordField";
import { MIN_PASSWORD_LENGTH } from "@/components/auth/CredentialsForm";
import { useLinkSession } from "@/hooks/useLinkSession";
import FullScreenMessage from "@/components/FullScreenMessage";

export default function ResetPasswordPage() {
  const router = useRouter();
  const status = useLinkSession();
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
