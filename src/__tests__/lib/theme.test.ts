import { describe, it, expect, beforeEach, vi } from "vitest";
import { applyTheme, readThemePreference, saveThemePreference, THEME_INIT_SCRIPT } from "@/lib/theme";

const html = () => document.documentElement;
/** Runs the inline <head> script exactly as the browser would. */
const runInitScript = () => new Function(THEME_INIT_SCRIPT)();

beforeEach(() => {
  localStorage.clear();
  html().className = "";
  vi.restoreAllMocks();
});

describe("theme preference", () => {
  it("follows the device by default", () => {
    expect(readThemePreference()).toBe("system");
  });

  it("falls back to the device setting for a stored value it doesn't know", () => {
    localStorage.setItem("workout_cache_theme", JSON.stringify("sepia"));
    expect(readThemePreference()).toBe("system");
  });

  it("saves a choice and applies it to the page at once", () => {
    saveThemePreference("dark");
    expect(readThemePreference()).toBe("dark");
    expect(html()).toHaveClass("dark");

    saveThemePreference("light");
    expect(html()).toHaveClass("light");
    expect(html()).not.toHaveClass("dark");
  });

  it("removes any override when going back to System", () => {
    applyTheme("dark");
    saveThemePreference("system");
    expect(html().classList.contains("dark") || html().classList.contains("light")).toBe(false);
  });
});

describe("THEME_INIT_SCRIPT (runs in <head> before first paint)", () => {
  it("applies a saved light or dark choice", () => {
    saveThemePreference("dark");
    html().className = "";
    runInitScript();
    expect(html()).toHaveClass("dark");
  });

  it("leaves the page following the device for System or anything unexpected", () => {
    localStorage.setItem("workout_cache_theme", JSON.stringify("system"));
    runInitScript();
    localStorage.setItem("workout_cache_theme", "not json");
    runInitScript();
    expect(html().className).toBe("");
  });

  it("never throws when storage is unavailable (e.g. private browsing)", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("denied"); });
    expect(runInitScript).not.toThrow();
  });
});
