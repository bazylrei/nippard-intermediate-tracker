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
  upsertPreferences: vi.fn(),
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
  db.getPreferences.mockResolvedValue({ unit: "kg", alternateSelections: {}, exerciseNotes: {}, bodyWeightKg: 80, heightCm: 180 });
  db.upsertPreferences.mockResolvedValue(undefined);
});

async function renderPage() {
  render(<MyProgram />);
  await screen.findByText("Week 1 Overview");
}

const openSettings = () => fireEvent.click(screen.getAllByRole("button")[0]);

describe("Program page — week overview", () => {
  it("links each completed day to its workout and leaves the rest plain", async () => {
    await renderPage();
    const hrefs = screen.getAllByRole("link").map((l) => l.getAttribute("href"));
    expect(hrefs).toEqual(["/history/s1", "/history/s2"]);
  });
});

describe("Program page — settings", () => {
  it("toggles the unit and saves it through the DB layer", async () => {
    await renderPage();
    openSettings();
    fireEvent.click(screen.getByLabelText("Weight unit"));
    expect(screen.getByLabelText("Weight unit")).toHaveTextContent("LBS");
    await waitFor(() => expect(db.upsertPreferences).toHaveBeenCalledWith("user-1", { unit: "lbs" }));
  });

  it("reverts the unit and shows an alert when the save fails", async () => {
    db.upsertPreferences.mockRejectedValue(new Error("offline"));
    await renderPage();
    openSettings();
    fireEvent.click(screen.getByLabelText("Weight unit"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't change the weight unit");
    expect(screen.getByLabelText("Weight unit")).toHaveTextContent("KG");
  });

  it("saves body stats through upsertPreferences", async () => {
    await renderPage();
    openSettings();
    const input = screen.getByLabelText("Body weight (kg)");
    fireEvent.change(input, { target: { value: "82.5" } });
    fireEvent.blur(input);
    await waitFor(() => expect(db.upsertPreferences).toHaveBeenCalledWith("user-1", { bodyWeightKg: 82.5, heightCm: 180 }));
  });

  it("does not save when a field is left unchanged", async () => {
    await renderPage();
    openSettings();
    fireEvent.blur(screen.getByLabelText("Height (cm)"));
    expect(db.upsertPreferences).not.toHaveBeenCalled();
  });

  it("reverts body stats and shows an alert when the save fails", async () => {
    db.upsertPreferences.mockRejectedValue(new Error("offline"));
    await renderPage();
    openSettings();
    const input = screen.getByLabelText("Body weight (kg)");
    fireEvent.change(input, { target: { value: "90" } });
    fireEvent.blur(input);
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't save your body stats");
    expect(screen.getByLabelText("Body weight (kg)")).toHaveValue(80);
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
    fireEvent.click(screen.getAllByRole("button")[1]);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/auth"));
    expect(auth.signOut).toHaveBeenCalled();
  });

  it("stays put and shows an alert when signing out fails", async () => {
    auth.signOut.mockRejectedValue(new Error("offline"));
    await renderPage();
    fireEvent.click(screen.getAllByRole("button")[1]);
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't sign out");
    expect(router.replace).not.toHaveBeenCalledWith("/auth");
  });
});
