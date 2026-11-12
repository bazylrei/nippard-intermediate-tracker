import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const loader = vi.hoisted(() => ({ loadFullProgram: vi.fn() }));
vi.mock("@/lib/program-db", () => loader);
vi.mock("@/lib/supabase", () => ({ createClient: () => ({}) }));

import { ProgramProvider, useProgramContext } from "@/context/ProgramContext";
import { cacheSet } from "@/lib/cache";

function Probe() {
  const { ready, failed, program } = useProgramContext();
  return <p>{`ready=${ready} failed=${failed} weeks=${program.length}`}</p>;
}

const data = { program: [{ week: 1, days: [] }], warmupSteps: {}, failureTechniques: {}, programId: "p1" };

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("ProgramProvider", () => {
  it("becomes ready once the program loads", async () => {
    loader.loadFullProgram.mockResolvedValue(data);
    render(<ProgramProvider><Probe /></ProgramProvider>);
    expect(await screen.findByText("ready=true failed=false weeks=1")).toBeInTheDocument();
  });

  it("reports failure when loading fails and nothing is cached", async () => {
    loader.loadFullProgram.mockResolvedValue(null);
    render(<ProgramProvider><Probe /></ProgramProvider>);
    expect(await screen.findByText("ready=false failed=true weeks=0")).toBeInTheDocument();
  });

  it("reports failure when the loader throws", async () => {
    loader.loadFullProgram.mockRejectedValue(new Error("offline"));
    render(<ProgramProvider><Probe /></ProgramProvider>);
    expect(await screen.findByText(/failed=true/)).toBeInTheDocument();
  });

  it("keeps showing a cached program when a refresh fails", async () => {
    cacheSet("program-v1", data);
    loader.loadFullProgram.mockResolvedValue(null);
    render(<ProgramProvider><Probe /></ProgramProvider>);
    await waitFor(() => expect(loader.loadFullProgram).toHaveBeenCalled());
    expect(screen.getByText("ready=true failed=false weeks=1")).toBeInTheDocument();
  });
});
