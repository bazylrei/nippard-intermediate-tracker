import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import WeekSwitcher from "@/components/widgets/WeekSwitcher";

const props = { label: "Week 2 of 4", canGoBack: true, canGoForward: true, onBack: vi.fn(), onForward: vi.fn() };

describe("WeekSwitcher", () => {
  it("shows the label and moves a week either way", () => {
    const onBack = vi.fn();
    const onForward = vi.fn();
    render(<WeekSwitcher {...props} onBack={onBack} onForward={onForward} />);
    expect(screen.getByRole("heading", { name: "Week 2 of 4" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Previous week" }));
    fireEvent.click(screen.getByRole("button", { name: "Next week" }));

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onForward).toHaveBeenCalledTimes(1);
  });

  it("disables an arrow at either end of the program", () => {
    render(<WeekSwitcher {...props} canGoBack={false} canGoForward={false} />);
    expect(screen.getByRole("button", { name: "Previous week" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next week" })).toBeDisabled();
  });

  it("uses the heading level it is given", () => {
    render(<WeekSwitcher {...props} headingAs="h3" />);
    expect(screen.getByRole("heading", { level: 3 })).toBeInTheDocument();
  });
});
