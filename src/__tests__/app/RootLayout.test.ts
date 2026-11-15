import { describe, it, expect, vi } from "vitest";

vi.mock("next/font/google", () => ({
  Barlow_Condensed: () => ({ variable: "" }),
  Barlow: () => ({ variable: "" }),
}));
vi.mock("@/context/ProgramContext", () => ({ ProgramProvider: () => null }));
vi.mock("@/context/RestTimerContext", () => ({ RestTimerProvider: () => null }));
vi.mock("@/components/RestTimerBar", () => ({ default: () => null }));
vi.mock("@/lib/program-db", () => ({ ACTIVE_PROGRAM_NAME: "Test Program" }));

import { viewport } from "@/app/layout";

describe("root viewport", () => {
  it("caps the scale so focusing an input doesn't zoom the page on iOS", () => {
    expect(viewport.maximumScale).toBe(1);
  });
});
