"use client";

import { useState } from "react";
import { readThemePreference, saveThemePreference, THEME_PREFERENCES, type ThemePreference } from "@/lib/theme";

const LABELS: Record<ThemePreference, string> = { system: "System", light: "Light", dark: "Dark" };

/** Light / dark / follow the device. Saved on this device and applied at once. */
export default function ThemeSetting() {
  const [theme, setTheme] = useState<ThemePreference>(readThemePreference);

  function choose(next: ThemePreference) {
    saveThemePreference(next);
    setTheme(next);
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <span id="theme-label" className="text-sm text-fg">Theme</span>
      <div role="radiogroup" aria-labelledby="theme-label" className="flex rounded-lg p-0.5"
        style={{ background: "color-mix(in srgb, var(--fg) 6%, transparent)", border: "1px solid color-mix(in srgb, var(--fg) 10%, transparent)" }}>
        {THEME_PREFERENCES.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={theme === option}
            onClick={() => choose(option)}
            className={`px-3 py-1 rounded-md text-sm font-display font-semibold transition-colors cursor-pointer ${
              theme === option ? "bg-primary text-primary-fg" : "text-muted hover:text-fg"
            }`}
          >
            {LABELS[option]}
          </button>
        ))}
      </div>
    </div>
  );
}
