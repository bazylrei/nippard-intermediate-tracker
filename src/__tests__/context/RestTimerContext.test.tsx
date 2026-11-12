import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { RestTimerProvider, useRestTimer } from "@/context/RestTimerContext";
import React from "react";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <RestTimerProvider>{children}</RestTimerProvider>
);

describe("RestTimerContext", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("has correct initial state", () => {
    const { result } = renderHook(() => useRestTimer(), { wrapper });
    expect(result.current.isActive).toBe(false);
    expect(result.current.remaining).toBe(0);
    expect(result.current.total).toBe(0);
  });

  it("sets isActive=true and remaining/total after start(60)", () => {
    const { result } = renderHook(() => useRestTimer(), { wrapper });

    act(() => {
      result.current.start(60);
    });

    expect(result.current.isActive).toBe(true);
    expect(result.current.remaining).toBe(60);
    expect(result.current.total).toBe(60);
  });

  it("decrements remaining after 1000ms tick", () => {
    const { result } = renderHook(() => useRestTimer(), { wrapper });

    act(() => {
      result.current.start(10);
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Math.ceil((endTime - Date.now()) / 1000) = Math.ceil(9000/1000) = 9
    expect(result.current.remaining).toBe(9);
  });

  it("auto-stops and sets isActive=false when timer reaches 0", () => {
    const { result } = renderHook(() => useRestTimer(), { wrapper });

    act(() => {
      result.current.start(5);
    });

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.isActive).toBe(false);
    expect(result.current.remaining).toBe(0);
  });

  it("stop() while active sets isActive=false and remaining=0", () => {
    const { result } = renderHook(() => useRestTimer(), { wrapper });

    act(() => {
      result.current.start(60);
    });

    act(() => {
      result.current.stop();
    });

    expect(result.current.isActive).toBe(false);
    expect(result.current.remaining).toBe(0);
  });

  it("start(30) while already running resets total to 30", () => {
    const { result } = renderHook(() => useRestTimer(), { wrapper });

    act(() => {
      result.current.start(60);
    });

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    act(() => {
      result.current.start(30);
    });

    expect(result.current.total).toBe(30);
    expect(result.current.remaining).toBe(30);
    expect(result.current.isActive).toBe(true);
  });

  it("stop() when already stopped does not throw", () => {
    const { result } = renderHook(() => useRestTimer(), { wrapper });

    expect(() => {
      act(() => {
        result.current.stop();
      });
    }).not.toThrow();

    expect(result.current.isActive).toBe(false);
  });

  it("advances correctly over multiple ticks", () => {
    const { result } = renderHook(() => useRestTimer(), { wrapper });

    act(() => {
      result.current.start(10);
    });

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.remaining).toBe(7);
  });
});
