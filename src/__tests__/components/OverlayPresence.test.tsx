import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { useState } from "react";
import OverlayPresence, { OVERLAY_EXIT_MS } from "@/components/OverlayPresence";

function Sheet({ label = "sheet" }: { label?: string }) {
  const [typed] = useState(() => Math.random());
  return <div data-testid="sheet" data-typed={typed}>{label}</div>;
}

const ui = (open: boolean, label?: string) => <OverlayPresence>{open && <Sheet label={label} />}</OverlayPresence>;
const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });

describe("OverlayPresence", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("renders nothing while closed", () => {
    render(ui(false));
    expect(screen.queryByTestId("sheet")).toBeNull();
  });

  it("shows the overlay as live, not closing, while open", () => {
    render(ui(true));
    const wrapper = screen.getByTestId("sheet").parentElement!;
    expect(wrapper).not.toHaveAttribute("data-closing");
    expect(wrapper).not.toHaveAttribute("inert");
  });

  it("keeps the overlay mounted, closing and inert, until the exit animation is done", () => {
    const { rerender } = render(ui(true, "hello"));
    rerender(ui(false));

    const sheet = screen.getByTestId("sheet");
    expect(sheet).toHaveTextContent("hello"); // the last content, not blank
    expect(sheet.parentElement).toHaveAttribute("data-closing");
    expect(sheet.parentElement).toHaveAttribute("inert");

    advance(OVERLAY_EXIT_MS - 1);
    expect(screen.getByTestId("sheet")).toBeInTheDocument();
    advance(1);
    expect(screen.queryByTestId("sheet")).toBeNull();
  });

  it("does not remount the overlay when it starts closing, so its enter animation doesn't replay", () => {
    const { rerender } = render(ui(true));
    const before = screen.getByTestId("sheet");
    rerender(ui(false));
    expect(screen.getByTestId("sheet")).toBe(before);
  });

  it("shows a fresh, live overlay when reopened mid-exit", () => {
    const { rerender } = render(ui(true));
    const first = screen.getByTestId("sheet");
    rerender(ui(false));
    advance(OVERLAY_EXIT_MS / 2);
    rerender(ui(true));

    const second = screen.getByTestId("sheet");
    expect(second).not.toBe(first);
    expect(second.parentElement).not.toHaveAttribute("data-closing");
    advance(OVERLAY_EXIT_MS * 2); // the old exit timer must not close the new overlay
    expect(screen.getByTestId("sheet")).toBeInTheDocument();
  });

  it("opens again after a full close", () => {
    const { rerender } = render(ui(true));
    rerender(ui(false));
    advance(OVERLAY_EXIT_MS);
    rerender(ui(true));
    expect(screen.getByTestId("sheet").parentElement).not.toHaveAttribute("data-closing");
  });
});
