"use client";

import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export const authFieldClass = "w-full rounded-xl px-4 py-3 text-fg bg-elevated border border-border focus:outline-none focus:border-primary";

interface Props {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  /** "new-password" when choosing one, "current-password" when entering it. */
  autoComplete: "new-password" | "current-password";
  hint?: string;
}

/** A password input with a show/hide toggle, so a typo is easy to spot. */
export default function PasswordField({ value, onChange, label = "Password", autoComplete, hint }: Props) {
  const id = useId();
  const [shown, setShown] = useState(false);
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm text-muted">{label}</label>
      <div className="relative">
        <input
          id={id}
          type={shown ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          required
          className={`${authFieldClass} pr-12`}
        />
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          aria-label={shown ? "Hide password" : "Show password"}
          className="absolute right-1 top-1/2 -translate-y-1/2 p-2.5 text-subtle hover:text-fg cursor-pointer"
        >
          {shown ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {hint && <p className="text-xs text-subtle">{hint}</p>}
    </div>
  );
}
