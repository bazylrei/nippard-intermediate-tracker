"use client";

import { useState } from "react";
import { authErrorMessage } from "@/lib/auth-errors";
import PasswordField, { authFieldClass } from "./PasswordField";

export const MIN_PASSWORD_LENGTH = 8;

interface Props {
  mode: "signin" | "signup";
  email: string;
  onEmailChange: (email: string) => void;
  /** Signs in or creates the account; rejects with the Auth error, which the form explains. */
  onSubmit: (email: string, password: string) => Promise<void>;
  onSwitchMode: () => void;
  /** Offered when signing in. */
  onForgot: () => void;
}

const COPY = {
  signin: { title: "Welcome back", submit: "Sign in", switchText: "No account? Create one" },
  signup: { title: "Create your account", submit: "Create account", switchText: "Have an account? Sign in" },
} as const;

export default function CredentialsForm({ mode, email, onEmailChange, onSubmit, onSwitchMode, onForgot }: Props) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const copy = COPY[mode];
  // A length rule only for choosing a password: someone signing in may have an older, shorter one.
  const passwordOk = mode === "signin" ? password.length > 0 : password.length >= MIN_PASSWORD_LENGTH;
  const ready = email.trim().length > 0 && passwordOk && !busy;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit(email.trim(), password);
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} aria-label={copy.title} className="flex-1 flex flex-col justify-center gap-5">
      <h1 className="font-display text-3xl font-bold text-fg leading-tight">{copy.title}</h1>

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

      <PasswordField
        value={password}
        onChange={setPassword}
        autoComplete={mode === "signin" ? "current-password" : "new-password"}
        hint={mode === "signup" ? `At least ${MIN_PASSWORD_LENGTH} characters` : undefined}
      />

      {error && <p role="alert" className="text-sm text-danger bg-danger/10 px-3 py-2 rounded-lg">{error}</p>}

      <button type="submit" disabled={!ready} className="btn-primary gloss w-full font-display font-bold text-lg py-4 rounded-2xl cursor-pointer disabled:opacity-60">
        {busy ? "…" : copy.submit}
      </button>

      <div className="flex flex-col items-center gap-1">
        {mode === "signin" && (
          <button type="button" onClick={onForgot} className="text-sm text-muted hover:text-fg py-1.5 cursor-pointer">
            Forgot password?
          </button>
        )}
        <button type="button" onClick={onSwitchMode} className="text-sm text-muted hover:text-fg py-1.5 cursor-pointer">
          {copy.switchText}
        </button>
      </div>
    </form>
  );
}
