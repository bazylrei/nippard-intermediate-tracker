import { cacheGet, cacheSet } from "./cache";

/** "system" follows the device's appearance; the others override it on this device. */
export type ThemePreference = "system" | "light" | "dark";

export const THEME_PREFERENCES: ThemePreference[] = ["system", "light", "dark"];

/** cache.ts key; the full localStorage key is `workout_cache_theme`. */
const KEY = "theme";
const STORAGE_KEY = `workout_cache_${KEY}`;

function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === "string" && (THEME_PREFERENCES as string[]).includes(value);
}

export function readThemePreference(): ThemePreference {
  const stored = cacheGet<unknown>(KEY);
  return isThemePreference(stored) ? stored : "system";
}

/** `html.light` / `html.dark` (globals.css) override the device setting; no class follows it. */
export function applyTheme(theme: ThemePreference): void {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  if (theme !== "system") root.classList.add(theme);
}

export function saveThemePreference(theme: ThemePreference): void {
  cacheSet(KEY, theme);
  applyTheme(theme);
}

/** Whether the device itself is in dark mode (what "System" follows). */
export function deviceIsDark(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** The theme actually showing: the saved choice, or the device's appearance while following it. */
export function effectiveTheme(preference: ThemePreference = readThemePreference()): "light" | "dark" {
  if (preference !== "system") return preference;
  return deviceIsDark() ? "dark" : "light";
}

/** Switches to the other of light and dark, judged from what's showing now, and saves it. Returns the new theme. */
export function flipTheme(): "light" | "dark" {
  const next = effectiveTheme() === "dark" ? "light" : "dark";
  saveThemePreference(next);
  return next;
}

/**
 * Inlined in <head> so the saved theme applies before first paint (no flash
 * of the wrong theme). Plain ES5, no imports: it runs before the app loads.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=JSON.parse(localStorage.getItem(${JSON.stringify(STORAGE_KEY)}));if(t==="light"||t==="dark")document.documentElement.classList.add(t);}catch(e){}})();`;
