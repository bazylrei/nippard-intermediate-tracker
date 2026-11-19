import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import SectionHeading from "@/components/widgets/SectionHeading";

describe("SectionHeading", () => {
  it("is an h2 unless another level is asked for", () => {
    const { unmount } = render(<SectionHeading>Account</SectionHeading>);
    expect(screen.getByRole("heading", { level: 2, name: "Account" })).toBeInTheDocument();
    unmount();
    render(<SectionHeading as="h3">Recent activity</SectionHeading>);
    expect(screen.getByRole("heading", { level: 3, name: "Recent activity" })).toBeInTheDocument();
  });

  it("adds the caller's spacing to the shared look", () => {
    render(<SectionHeading className="px-1">Account</SectionHeading>);
    expect(screen.getByRole("heading")).toHaveClass("uppercase", "px-1");
  });
});
