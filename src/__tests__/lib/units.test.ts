import { describe, it, expect } from "vitest";
import { kgToDisplay, displayToKg, KG_TO_LBS } from "@/lib/units";

describe("units", () => {
  it("leaves kg untouched", () => {
    expect(kgToDisplay(102.5, "kg")).toBe(102.5);
    expect(displayToKg(102.5, "kg")).toBe(102.5);
  });

  it("shows lbs rounded to the nearest 0.25", () => {
    expect(kgToDisplay(100, "lbs")).toBe(220.5); // 220.462
    expect(kgToDisplay(20, "lbs")).toBe(44); // 44.0924
  });

  it("converts typed lbs back to kg exactly", () => {
    expect(displayToKg(KG_TO_LBS * 50, "lbs")).toBeCloseTo(50, 10);
  });
});
