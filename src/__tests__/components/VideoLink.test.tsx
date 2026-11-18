import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const open = vi.hoisted(() => vi.fn());
vi.mock("@/lib/youtube", () => ({ openInYouTubeApp: open }));

import VideoLink from "@/components/VideoLink";

describe("VideoLink", () => {
  it("is an ordinary new-tab link to the video", () => {
    render(<VideoLink url="https://youtu.be/abc">Watch</VideoLink>);
    const link = screen.getByRole("link", { name: "Watch" });
    expect(link).toHaveAttribute("href", "https://youtu.be/abc");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("lets the ordinary link open when there's no app to try", () => {
    open.mockReturnValue(false);
    render(<VideoLink url="https://youtu.be/abc">Watch</VideoLink>);
    expect(fireEvent.click(screen.getByRole("link"))).toBe(true); // not prevented
  });

  it("takes over the tap when the YouTube app is being tried", () => {
    open.mockReturnValue(true);
    render(<VideoLink url="https://youtu.be/abc">Watch</VideoLink>);
    expect(fireEvent.click(screen.getByRole("link"))).toBe(false); // default prevented
    expect(open).toHaveBeenCalledWith("https://youtu.be/abc");
  });
});
