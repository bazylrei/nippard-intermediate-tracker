"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { effectiveTheme, flipTheme } from "@/lib/theme";

/**
 * A corner button that flips between light and dark, saved on this device. It
 * shows what a tap switches to, and stays right if the device changes appearance
 * while the page is open.
 */
export default function ThemeToggle() {
  // Unknown until mounted: the server can't tell what the device is showing.
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);

  useEffect(() => {
    const refresh = () => setTheme(effectiveTheme());
    refresh();
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", refresh);
    return () => media.removeEventListener("change", refresh);
  }, []);

  if (theme === null) return <span className="w-9 h-9" aria-hidden />;

  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(flipTheme())}
      aria-label={`Switch to ${next} mode`}
      className="w-9 h-9 flex items-center justify-center text-muted hover:text-fg transition-colors rounded-xl cursor-pointer"
    >
      {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}
