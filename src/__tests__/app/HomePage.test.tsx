import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
const program = vi.hoisted(() => [] as unknown[]);
vi.mock("@/context/ProgramContext", () => ({ useProgramContext: () => ({ program }) }));
const feed = vi.hoisted(() => ({ nextSession: null as { week: number; dayIndex: number } | null, hasResume: false, items: [] }));
vi.mock("@/hooks/useHomeFeed", () => ({ useHomeFeed: () => ({ feed, failed: false }) }));
const weighIn = vi.hoisted(() => ({ due: false, unit: "kg", save: vi.fn(), skip: vi.fn() }));
vi.mock("@/hooks/useWeighIn", () => ({ useWeighIn: () => weighIn }));

import Home from "@/app/(main)/page";

beforeEach(() => {
  weighIn.due = false;
  feed.nextSession = null;
  program.length = 0;
});

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

describe("Home — choosing what to train", () => {
  it("offers another workout than the suggested one, on the Program screen", () => {
    program.push({ week: 1, days: [{ dayType: "upper-a", exercises: [{ id: "bench", name: "Bench" }] }] });
    feed.nextSession = { week: 1, dayIndex: 0 };
    render(<Home />);
    expect(screen.getByRole("button", { name: /Start workout/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Choose a different workout" })).toHaveAttribute("href", "/program");
  });

  it("has nothing to choose from before the program loads", () => {
    render(<Home />);
    expect(screen.queryByRole("link", { name: "Choose a different workout" })).toBeNull();
  });
});
