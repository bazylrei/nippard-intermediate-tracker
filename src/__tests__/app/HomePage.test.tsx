import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/context/ProgramContext", () => ({ useProgramContext: () => ({ program: [] }) }));
vi.mock("@/hooks/useHomeFeed", () => ({ useHomeFeed: () => ({ feed: { nextSession: null, hasResume: false, items: [] }, failed: false }) }));
const weighIn = vi.hoisted(() => ({ due: false, unit: "kg", save: vi.fn(), skip: vi.fn() }));
vi.mock("@/hooks/useWeighIn", () => ({ useWeighIn: () => weighIn }));

import Home from "@/app/(main)/page";

beforeEach(() => { weighIn.due = false; });

describe("Home — weekly weigh-in", () => {
  it("asks for this week's weight at the top when it's due", () => {
    weighIn.due = true;
    render(<Home />);
    expect(screen.getByRole("form", { name: "Weekly weigh-in" })).toBeInTheDocument();
  });

  it("stays out of the way otherwise", () => {
    render(<Home />);
    expect(screen.queryByRole("form", { name: "Weekly weigh-in" })).toBeNull();
  });
});
