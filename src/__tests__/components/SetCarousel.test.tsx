import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import SetCarousel from "@/components/workout/SetCarousel";

const SLIDE_WIDTH = 300;
const scrollTo = vi.fn();

function renderCarousel(activeIndex: number) {
  return render(
    <SetCarousel
      count={3}
      activeIndex={activeIndex}
      slideLabel={(i) => `Set ${i + 1} of 3`}
      renderSlide={(i) => <p>slide {i}</p>}
    />,
  );
}

function mockReducedMotion(reduce: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({ matches: reduce }) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  scrollTo.mockClear();
  Element.prototype.scrollTo = scrollTo as unknown as Element["scrollTo"];
  // jsdom has no layout: place each slide SLIDE_WIDTH apart.
  vi.spyOn(HTMLElement.prototype, "offsetLeft", "get").mockImplementation(function (this: HTMLElement) {
    return Array.from(this.parentElement?.children ?? []).indexOf(this) * SLIDE_WIDTH;
  });
  mockReducedMotion(false);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("SetCarousel", () => {
  it("renders one labelled slide per set and marks the active one", () => {
    renderCarousel(1);
    expect(screen.getAllByRole("group")).toHaveLength(3);
    expect(screen.getByRole("group", { current: true })).toHaveAccessibleName("Set 2 of 3");
    expect(screen.getByRole("group", { current: true })).toHaveTextContent("slide 1");
  });

  it("jumps straight to the active slide on first render", () => {
    renderCarousel(1);
    expect(scrollTo).toHaveBeenCalledOnce();
    expect(scrollTo).toHaveBeenCalledWith({ left: SLIDE_WIDTH, behavior: "instant" });
  });

  it("slides across smoothly when the active set changes", () => {
    const { rerender } = renderCarousel(0);
    rerender(
      <SetCarousel count={3} activeIndex={2} slideLabel={(i) => `Set ${i + 1} of 3`} renderSlide={(i) => <p>slide {i}</p>} />,
    );
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 2 * SLIDE_WIDTH, behavior: "smooth" });
    expect(screen.getByRole("group", { current: true })).toHaveAccessibleName("Set 3 of 3");
  });

  it("does not animate when the user prefers reduced motion", () => {
    mockReducedMotion(true);
    const { rerender } = renderCarousel(0);
    rerender(
      <SetCarousel count={3} activeIndex={1} slideLabel={(i) => `Set ${i + 1} of 3`} renderSlide={(i) => <p>slide {i}</p>} />,
    );
    expect(scrollTo).toHaveBeenLastCalledWith({ left: SLIDE_WIDTH, behavior: "instant" });
  });
});
