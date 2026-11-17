"use client";

import { useState } from "react";
import type { SocialProvider } from "@/lib/auth";
import { authErrorMessage } from "@/lib/auth-errors";
import { useSocialProviders } from "@/hooks/useSocialProviders";
import ProviderIcon, { PROVIDER_LABELS } from "./ProviderIcon";

interface Props {
  /** Starts sign-in with the provider (the browser then leaves for it); rejects if it can't start. */
  onChoose: (provider: SocialProvider) => Promise<void>;
}

/** "Continue with Google" and any other provider switched on, then an "or" before the email form. Nothing while none is on. */
export default function SocialButtons({ onChoose }: Props) {
  const providers = useSocialProviders();
  const [busy, setBusy] = useState<SocialProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (providers.length === 0) return null;

  async function choose(provider: SocialProvider) {
    setBusy(provider);
    setError(null);
    try {
      await onChoose(provider);
      // The browser is on its way to the provider; leave the button pressed so it can't be tapped twice.
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      {providers.map((provider) => (
        <button
          key={provider}
          type="button"
          onClick={() => choose(provider)}
          disabled={busy !== null}
          className="w-full flex items-center justify-center gap-3 rounded-xl py-3 border border-border bg-elevated text-fg font-medium cursor-pointer disabled:opacity-60"
        >
          <ProviderIcon provider={provider} />
          {busy === provider ? "Opening…" : `Continue with ${PROVIDER_LABELS[provider]}`}
        </button>
      ))}
      {error && <p role="alert" className="text-sm text-danger bg-danger/10 px-3 py-2 rounded-lg">{error}</p>}
      <div className="flex items-center gap-3 text-xs text-subtle" role="separator" aria-label="or">
        <span className="flex-1 h-px bg-border" />
        or
        <span className="flex-1 h-px bg-border" />
      </div>
    </div>
  );
}
