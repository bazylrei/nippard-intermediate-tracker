"use client";

import { useState } from "react";
import { authErrorMessage } from "@/lib/auth-errors";
import { authFieldClass } from "./PasswordField";

interface Props {
  email: string;
  onEmailChange: (email: string) => void;
  /** Emails the reset link; rejects with the Auth error, which the form explains. */
  onSubmit: (email: string) => Promise<void>;
}

export default function ForgotPasswordForm({ email, onEmailChange, onSubmit }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = email.trim().length > 0 && !busy;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit(email.trim());
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} aria-label="Reset your password" className="flex-1 flex flex-col justify-center gap-5">
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-bold text-fg leading-tight">Reset your password</h1>
        <p className="text-sm text-muted">Enter your email and we&apos;ll send you a link to choose a new one.</p>
      </div>

      <div className="space-y-1">
        <label htmlFor="auth-email" className="block text-sm text-muted">Email</label>
        <input
          id="auth-email"
          type="email"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          autoComplete="email"
          required
          className={authFieldClass}
          placeholder="you@example.com"
        />
      </div>

      {error && <p role="alert" className="text-sm text-danger bg-danger/10 px-3 py-2 rounded-lg">{error}</p>}

      <button type="submit" disabled={!ready} className="btn-primary gloss w-full font-display font-bold text-lg py-4 rounded-2xl cursor-pointer disabled:opacity-60">
        {busy ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
