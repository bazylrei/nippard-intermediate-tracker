import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { WeekSchedule } from "@/lib/types";

const router = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
const auth = vi.hoisted(() => ({ getSignedInUser: vi.fn(), signOut: vi.fn() }));
vi.mock("@/lib/auth", () => auth);

const db = vi.hoisted(() => ({
  getIncompleteSession: vi.fn(),
  getCompletedSlots: vi.fn(),
  getPreferences: vi.fn(),
  getLatestBodyWeight: vi.fn(),
}));
vi.mock("@/lib/db", () => db);

const ex = { id: "bench", name: "Bench", repRange: [6, 8] };
const day = (dayType: string) => ({ dayType, exercises: [ex] });
const program = [{ week: 1, days: [day("upper-a"), day("lower-a"), day("push")] }] as unknown as WeekSchedule[];
vi.mock("@/context/ProgramContext", () => ({ useProgramContext: () => ({ program }) }));

import MyProgram from "@/app/(main)/program/page";

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  vi.spyOn(console, "error").mockImplementation(() => {});
  auth.getSignedInUser.mockResolvedValue({ id: "user-1", email: "me@example.com" });
  auth.signOut.mockResolvedValue(undefined);
  db.getIncompleteSession.mockResolvedValue(null);
  db.getCompletedSlots.mockResolvedValue([
    { sessionId: "s2", week: 1, dayIndex: 1 },
    { sessionId: "s1", week: 1, dayIndex: 0 },
  ]);
});

async function renderPage() {
  render(<MyProgram />);
  await screen.findByText("Week 1 Overview");
}

describe("Program page — week overview", () => {
  it("links each completed day to its workout and leaves the rest plain", async () => {
    await renderPage();
    const hrefs = screen.getAllByRole("link").map((l) => l.getAttribute("href")).filter((href) => href !== "/settings");
    expect(hrefs).toEqual(["/history/s1", "/history/s2"]);
  });
});

describe("Program page — settings", () => {
  it("links to the Settings page from its header", async () => {
    await renderPage();
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute("href", "/settings");
  });

  it("no longer loads preferences or weigh-ins: those are the Settings page's", async () => {
    await renderPage();
    expect(db.getPreferences).not.toHaveBeenCalled();
    expect(db.getLatestBodyWeight).not.toHaveBeenCalled();
  });
});

describe("Program page — loading and sign-out", () => {
  it("explains instead of loading forever when the first load fails", async () => {
    db.getCompletedSlots.mockRejectedValue(new Error("offline"));
    render(<MyProgram />);
    expect(await screen.findByText(/Couldn't load your program/)).toBeInTheDocument();
  });

  it("signs out through lib/auth and goes to the sign-in page", async () => {
    await renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/auth"));
    expect(auth.signOut).toHaveBeenCalled();
  });

  it("stays put and shows an alert when signing out fails", async () => {
    auth.signOut.mockRejectedValue(new Error("offline"));
    await renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't sign out");
    expect(router.replace).not.toHaveBeenCalledWith("/auth");
  });
});
