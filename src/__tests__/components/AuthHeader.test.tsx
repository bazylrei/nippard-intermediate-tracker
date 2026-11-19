import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AuthHeader from "@/components/auth/AuthHeader";

describe("AuthHeader", () => {
  it("has no back arrow on the welcome screen", () => {
    render(<AuthHeader />);
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
  });

  it("goes back from the later screens", () => {
    const onBack = vi.fn();
    render(<AuthHeader onBack={onBack} />);
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
