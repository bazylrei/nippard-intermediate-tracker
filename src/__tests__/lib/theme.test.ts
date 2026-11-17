import { describe, it, expect, beforeEach, vi } from "vitest";
import { applyTheme, effectiveTheme, flipTheme, readThemePreference, saveThemePreference, THEME_INIT_SCRIPT } from "@/lib/theme";

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

/** jsdom has no matchMedia: pretend the device is in dark (or light) mode. */
function deviceMode(dark: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({ matches: dark }) as unknown as typeof window.matchMedia;
}

describe("effectiveTheme", () => {
  it("is the saved choice, whatever the device is doing", () => {
    deviceMode(true);
    saveThemePreference("light");
    expect(effectiveTheme()).toBe("light");
    deviceMode(false);
    saveThemePreference("dark");
    expect(effectiveTheme()).toBe("dark");
  });

  it("follows the device while on System", () => {
    deviceMode(true);
    expect(effectiveTheme()).toBe("dark");
    deviceMode(false);
    expect(effectiveTheme()).toBe("light");
  });
});

describe("flipTheme", () => {
  it("goes from light to dark and back, saving and applying each", () => {
    deviceMode(false);
    saveThemePreference("light");

    expect(flipTheme()).toBe("dark");
    expect(readThemePreference()).toBe("dark");
    expect(html()).toHaveClass("dark");

    expect(flipTheme()).toBe("light");
    expect(readThemePreference()).toBe("light");
    expect(html()).toHaveClass("light");
  });

  it("flips what's showing while following the device, so one tap always changes the screen", () => {
    deviceMode(true); // System, device in dark mode
    expect(flipTheme()).toBe("light");
    expect(html()).toHaveClass("light");

    saveThemePreference("system");
    deviceMode(false);
    expect(flipTheme()).toBe("dark");
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
