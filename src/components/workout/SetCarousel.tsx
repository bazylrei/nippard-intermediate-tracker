"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

interface Props {
  count: number;
  activeIndex: number;
  slideLabel: (index: number) => string;
  renderSlide: (index: number) => ReactNode;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

/**
 * A swipeable row of slides (native scroll-snap). Slides across to
 * `activeIndex` whenever it changes; the first positioning is instant.
 */
export default function SetCarousel({ count, activeIndex, slideLabel, renderSlide }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const positioned = useRef(false);

  useLayoutEffect(() => {
    const track = trackRef.current;
    const first = track?.children[0] as HTMLElement | undefined;
    const target = track?.children[activeIndex] as HTMLElement | undefined;
    if (!track || !first || !target) return;
    const animate = positioned.current && !prefersReducedMotion();
    positioned.current = true;
    // jsdom has no Element.scrollTo, hence the optional call.
    track.scrollTo?.({ left: target.offsetLeft - first.offsetLeft, behavior: animate ? "smooth" : "instant" });
  }, [activeIndex]);

  return (
    <div
      ref={trackRef}
      aria-roledescription="carousel"
      className="-mx-4 px-4 scroll-px-4 flex items-start gap-3 overflow-x-auto overscroll-x-contain snap-x snap-mandatory no-scrollbar"
    >
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          role="group"
          aria-roledescription="slide"
          aria-label={slideLabel(i)}
          aria-current={i === activeIndex ? "true" : undefined}
          className="shrink-0 basis-[calc(100%-1rem)] snap-start snap-always"
        >
          {renderSlide(i)}
        </div>
      ))}
    </div>
  );
}
