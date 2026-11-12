import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { act } from "@testing-library/react";
import { RestTimerProvider, useRestTimer } from "@/context/RestTimerContext";
import RestTimerBar from "@/components/RestTimerBar";
import React, { useEffect } from "react";

function Starter({ seconds }: { seconds: number }) {
  const { start } = useRestTimer();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { start(seconds); }, []);
  return null;
}

function renderWithTimer(seconds?: number) {
  return render(
    <RestTimerProvider>
      {seconds !== undefined && <Starter seconds={seconds} />}
      <RestTimerBar />
    </RestTimerProvider>
  );
}

describe("RestTimerBar", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("is not in the document when no timer is active", () => {
    renderWithTimer();
    // RestTimerBar returns null when isActive=false
    expect(screen.queryByText(/Rest/)).not.toBeInTheDocument();
  });

  it("shows '1:05' for 65 seconds", () => {
    act(() => {
      renderWithTimer(65);
    });
    expect(screen.getByText("1:05")).toBeInTheDocument();
  });

  it("shows '1:30' for 90 seconds", () => {
    act(() => {
      renderWithTimer(90);
    });
    expect(screen.getByText("1:30")).toBeInTheDocument();
  });

  it("shows '0:09' for 9 seconds", () => {
    act(() => {
      renderWithTimer(9);
    });
    expect(screen.getByText("0:09")).toBeInTheDocument();
  });

  it("clicking the X (Skip rest) button stops the timer and hides the bar", () => {
    act(() => {
      renderWithTimer(60);
    });

    expect(screen.getByText("1:00")).toBeInTheDocument();

    const skipBtn = screen.getByRole("button", { name: "Skip rest" });
    act(() => {
      fireEvent.click(skipBtn);
    });

    // After stop, isActive=false so bar disappears
    expect(screen.queryByText("1:00")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Skip rest" })).not.toBeInTheDocument();
  });

  it("progress line div starts at 100% width", () => {
    const { container } = render(
      <RestTimerProvider>
        <Starter seconds={60} />
        <RestTimerBar />
      </RestTimerProvider>
    );

    act(() => {
      // allow state to settle
    });

    // The progress line is the div with bg-primary class inside the h-0.5 container
    const progressDivs = container.querySelectorAll(".bg-primary");
    // Find the one with inline width style
    const progressLine = Array.from(progressDivs).find(
      (el) => (el as HTMLElement).style.width !== ""
    ) as HTMLElement | undefined;

    expect(progressLine).toBeDefined();
    expect(progressLine?.style.width).toBe("100%");
  });
});
