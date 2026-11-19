import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import UnitSetting from "@/components/widgets/UnitSetting";

describe("UnitSetting", () => {
  it("offers KG and LBS, with the current unit selected", () => {
    render(<UnitSetting unit="kg" onChange={vi.fn()} />);
    expect(screen.getByRole("radiogroup", { name: "Weight unit" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "KG" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "LBS" })).toHaveAttribute("aria-checked", "false");
  });

  it("reflects the unit it's given", () => {
    render(<UnitSetting unit="lbs" onChange={vi.fn()} />);
    expect(screen.getByRole("radio", { name: "LBS" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "KG" })).toHaveAttribute("aria-checked", "false");
  });

  it("reports the unit that was chosen", () => {
    const onChange = vi.fn();
    render(<UnitSetting unit="kg" onChange={onChange} />);
    fireEvent.click(screen.getByRole("radio", { name: "LBS" }));
    expect(onChange).toHaveBeenCalledExactlyOnceWith("lbs");
  });

  it("doesn't report a change when the current unit is tapped again", () => {
    const onChange = vi.fn();
    render(<UnitSetting unit="kg" onChange={onChange} />);
    fireEvent.click(screen.getByRole("radio", { name: "KG" }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
