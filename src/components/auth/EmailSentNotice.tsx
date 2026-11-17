"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { authErrorMessage } from "@/lib/auth-errors";

interface Props {
  email: string;
  /** What the email is for: confirming a new account, or choosing a new password. */
  kind: "confirm" | "reset";
  /** Sends it again; rejects with the Auth error, which the notice explains. */
  onResend: () => Promise<void>;
  onBack: () => void;
}

type Resend = { state: "idle" | "sending" | "sent" } | { state: "failed"; message: string };

export default function EmailSentNotice({ email, kind, onResend, onBack }: Props) {
  const [resend, setResend] = useState<Resend>({ state: "idle" });

  async function sendAgain() {
    setResend({ state: "sending" });
    try {
      await onResend();
      setResend({ state: "sent" });
    } catch (err) {
      setResend({ state: "failed", message: authErrorMessage(err) });
    }
  }

  return (
    <div className="flex-1 flex flex-col justify-center gap-6 text-center">
      <div className="w-16 h-16 glass gloss rounded-full flex items-center justify-center mx-auto">
        <Mail size={28} className="text-primary" />
      </div>
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-bold text-fg leading-tight">Check your email</h1>
        {kind === "confirm" ? (
          <p className="text-sm text-muted leading-relaxed">
            We sent a link to <span className="text-fg font-semibold break-all">{email}</span>. Open it to confirm your account, then come back and sign in if you aren&apos;t signed in automatically. Already have an account? Sign in instead.
          </p>
        ) : (
          <p className="text-sm text-muted leading-relaxed">
            If there&apos;s an account for <span className="text-fg font-semibold break-all">{email}</span>, we&apos;ve sent a link to choose a new password.
          </p>
        )}
      </div>

      {resend.state === "failed" && <p role="alert" className="text-sm text-danger">{resend.message}</p>}
      {resend.state === "sent" && <p role="status" className="text-sm text-accent">Sent again.</p>}

      <div className="space-y-1">
        <button
          onClick={sendAgain}
          disabled={resend.state === "sending"}
          className="w-full glass gloss text-fg font-medium py-3 rounded-2xl text-sm cursor-pointer disabled:opacity-60"
        >
          {resend.state === "sending" ? "Sending…" : "Send it again"}
        </button>
        <button onClick={onBack} className="w-full text-sm text-muted hover:text-fg py-2 cursor-pointer">
          Back to sign in
        </button>
      </div>
    </div>
  );
}
