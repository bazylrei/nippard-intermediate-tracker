import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import ThemeToggle from "@/components/ThemeToggle";
import { readThemePreference } from "@/lib/theme";

type Listener = () => void;
let listeners: Listener[] = [];
let deviceDark = false;

beforeEach(() => {
  localStorage.clear();
  document.documentElement.className = "";
  listeners = [];
  deviceDark = false;
  window.matchMedia = vi.fn().mockImplementation(() => ({
    get matches() { return deviceDark; },
    addEventListener: (_: string, cb: Listener) => listeners.push(cb),
    removeEventListener: (_: string, cb: Listener) => { listeners = listeners.filter((l) => l !== cb); },
  })) as unknown as typeof window.matchMedia;
});

const toggle = (name: string) => screen.getByRole("button", { name });

describe("ThemeToggle", () => {
  it("offers dark mode while it's light, and light mode while it's dark", () => {
    const { unmount } = render(<ThemeToggle />);
    expect(toggle("Switch to dark mode")).toBeInTheDocument();
    unmount();

    localStorage.setItem("workout_cache_theme", JSON.stringify("dark"));
    render(<ThemeToggle />);
    expect(toggle("Switch to light mode")).toBeInTheDocument();
  });

  it("flips the page and remembers it on this device", () => {
    render(<ThemeToggle />);
    fireEvent.click(toggle("Switch to dark mode"));

    expect(document.documentElement).toHaveClass("dark");
    expect(readThemePreference()).toBe("dark");
    expect(toggle("Switch to light mode")).toBeInTheDocument();

    fireEvent.click(toggle("Switch to light mode"));
    expect(document.documentElement).toHaveClass("light");
    expect(readThemePreference()).toBe("light");
  });

  it("goes by what's showing while following a dark device, so one tap changes the screen", () => {
    deviceDark = true; // System, device in dark mode
    render(<ThemeToggle />);
    fireEvent.click(toggle("Switch to light mode"));
    expect(document.documentElement).toHaveClass("light");
  });

  it("keeps its icon right when the device changes appearance while open", () => {
    render(<ThemeToggle />);
    expect(toggle("Switch to dark mode")).toBeInTheDocument();

    deviceDark = true;
    act(() => listeners.forEach((l) => l()));
    expect(toggle("Switch to light mode")).toBeInTheDocument();
  });

  it("stops listening to the device when it goes away", () => {
    const { unmount } = render(<ThemeToggle />);
    expect(listeners).toHaveLength(1);
    unmount();
    expect(listeners).toHaveLength(0);
  });
});
