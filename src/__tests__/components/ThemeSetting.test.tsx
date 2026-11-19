import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ThemeSetting from "@/components/widgets/ThemeSetting";
import { readThemePreference } from "@/lib/theme";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.className = "";
});

describe("ThemeSetting", () => {
  it("shows System selected by default", () => {
    render(<ThemeSetting />);
    expect(screen.getByRole("radiogroup", { name: "Theme" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "System" })).toHaveAttribute("aria-checked", "true");
  });

  it("switches the page to dark and remembers it on this device", () => {
    render(<ThemeSetting />);
    fireEvent.click(screen.getByRole("radio", { name: "Dark" }));

    expect(screen.getByRole("radio", { name: "Dark" })).toHaveAttribute("aria-checked", "true");
    expect(document.documentElement).toHaveClass("dark");
    expect(readThemePreference()).toBe("dark");
  });

  it("shows the saved choice when opened again", () => {
    localStorage.setItem("workout_cache_theme", JSON.stringify("light"));
    render(<ThemeSetting />);
    expect(screen.getByRole("radio", { name: "Light" })).toHaveAttribute("aria-checked", "true");
  });
});
