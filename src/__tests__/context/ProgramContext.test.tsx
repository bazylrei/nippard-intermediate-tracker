import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

const loader = vi.hoisted(() => ({ loadFullProgram: vi.fn() }));
vi.mock("@/lib/program-db", () => loader);
const prefs = vi.hoisted(() => ({ setActiveProgram: vi.fn() }));
vi.mock("@/lib/db/preferences", () => prefs);

/** Stands in for Supabase auth: the test says who signs in and out. */
const auth = vi.hoisted(() => {
  let listener: ((event: string, session: { user: { id: string } } | null) => void) | null = null;
  return {
    onAuthStateChange: vi.fn((cb: typeof listener) => {
      listener = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    }),
    emit: (event: string, userId: string | null) => listener?.(event, userId ? { user: { id: userId } } : null),
  };
});
vi.mock("@/lib/supabase", () => ({ createClient: () => ({ auth }) }));

import { ProgramProvider, useProgramContext } from "@/context/ProgramContext";
import { cacheGet, cacheSet } from "@/lib/cache";

function Probe() {
  const { ready, failed, program, programId, programName, followProgram } = useProgramContext();
  return (
    <>
      <p>{`ready=${ready} failed=${failed} weeks=${program.length} id=${programId} name=${programName}`}</p>
      <button onClick={() => void followProgram("p2").catch(() => {})}>follow p2</button>
      <button onClick={() => void followProgram(null).catch(() => {})}>follow none</button>
    </>
  );
}

const data = { program: [{ week: 1, days: [] }], warmupSteps: {}, failureTechniques: {}, programId: "p1", programName: "Nippard" };
const none = { program: [], warmupSteps: {}, failureTechniques: {}, programId: null, programName: null };

/** Renders the provider and signs `userId` in, as Supabase reports the session on start. */
function renderSignedIn(userId: string | null = "user-1") {
  render(<ProgramProvider><Probe /></ProgramProvider>);
  act(() => auth.emit("INITIAL_SESSION", userId));
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  vi.spyOn(console, "error").mockImplementation(() => {});
  prefs.setActiveProgram.mockResolvedValue(undefined);
});

describe("ProgramProvider", () => {
  it("becomes ready once the signed-in user's program loads", async () => {
    loader.loadFullProgram.mockResolvedValue(data);
    renderSignedIn();
    expect(await screen.findByText("ready=true failed=false weeks=1 id=p1 name=Nippard")).toBeInTheDocument();
    expect(loader.loadFullProgram).toHaveBeenCalledWith(expect.anything(), "user-1");
  });

  it("is ready with no schedule when the user follows no program", async () => {
    loader.loadFullProgram.mockResolvedValue(none);
    renderSignedIn();
    expect(await screen.findByText("ready=true failed=false weeks=0 id=null name=null")).toBeInTheDocument();
  });

  it("reports failure when loading fails and nothing is cached", async () => {
    loader.loadFullProgram.mockResolvedValue(null);
    renderSignedIn();
    expect(await screen.findByText(/ready=false failed=true weeks=0/)).toBeInTheDocument();
  });

  it("reports failure when the loader throws", async () => {
    loader.loadFullProgram.mockRejectedValue(new Error("offline"));
    renderSignedIn();
    expect(await screen.findByText(/failed=true/)).toBeInTheDocument();
  });

  it("keeps showing a cached program when a refresh fails", async () => {
    cacheSet("program-v2", { ...data, userId: "user-1" });
    loader.loadFullProgram.mockResolvedValue(null);
    renderSignedIn();
    await waitFor(() => expect(loader.loadFullProgram).toHaveBeenCalled());
    expect(screen.getByText(/ready=true failed=false weeks=1/)).toBeInTheDocument();
  });

  it("never shows another account's cached program", async () => {
    cacheSet("program-v2", { ...data, userId: "someone-else" });
    loader.loadFullProgram.mockReturnValue(new Promise(() => {})); // still loading
    renderSignedIn("user-1");
    expect(screen.getByText(/ready=false .* id=null/)).toBeInTheDocument();
    await waitFor(() => expect(loader.loadFullProgram).toHaveBeenCalledWith(expect.anything(), "user-1"));
  });
});

describe("ProgramProvider — who is signed in", () => {
  it("doesn't reload when only the session token refreshes", async () => {
    loader.loadFullProgram.mockResolvedValue(data);
    renderSignedIn();
    await screen.findByText(/ready=true/);
    act(() => auth.emit("TOKEN_REFRESHED", "user-1"));
    await new Promise((r) => setTimeout(r, 10));
    expect(loader.loadFullProgram).toHaveBeenCalledTimes(1);
  });

  it("forgets the program on sign-out, on screen and on the device", async () => {
    loader.loadFullProgram.mockResolvedValue(data);
    renderSignedIn();
    await screen.findByText(/ready=true/);
    act(() => auth.emit("SIGNED_OUT", null));
    expect(screen.getByText(/ready=false .* id=null/)).toBeInTheDocument();
    expect(cacheGet("program-v2")).toBeNull();
  });
});

describe("ProgramProvider — following a program", () => {
  it("saves the program followed, then loads it", async () => {
    loader.loadFullProgram.mockResolvedValueOnce(none).mockResolvedValueOnce({ ...data, programId: "p2", programName: "Mine" });
    renderSignedIn();
    await screen.findByText(/id=null/);
    fireEvent.click(screen.getByRole("button", { name: "follow p2" }));
    expect(await screen.findByText(/id=p2 name=Mine/)).toBeInTheDocument();
    expect(prefs.setActiveProgram).toHaveBeenCalledWith("user-1", "p2");
  });

  it("can follow none", async () => {
    loader.loadFullProgram.mockResolvedValueOnce(data).mockResolvedValueOnce(none);
    renderSignedIn();
    await screen.findByText(/id=p1/);
    fireEvent.click(screen.getByRole("button", { name: "follow none" }));
    expect(await screen.findByText(/id=null/)).toBeInTheDocument();
    expect(prefs.setActiveProgram).toHaveBeenCalledWith("user-1", null);
  });

  it("keeps the current program when saving the new one fails", async () => {
    loader.loadFullProgram.mockResolvedValue(data);
    prefs.setActiveProgram.mockRejectedValue(new Error("offline"));
    renderSignedIn();
    await screen.findByText(/id=p1/);
    fireEvent.click(screen.getByRole("button", { name: "follow p2" }));
    await waitFor(() => expect(prefs.setActiveProgram).toHaveBeenCalled());
    expect(screen.getByText(/id=p1/)).toBeInTheDocument();
    expect(loader.loadFullProgram).toHaveBeenCalledTimes(1);
  });
});
