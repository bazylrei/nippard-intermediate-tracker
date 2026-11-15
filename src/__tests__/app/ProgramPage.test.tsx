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
  getLatestBodyWeight: vi.fn(),
  logBodyWeight: vi.fn(),
}));
vi.mock("@/lib/db", () => db);

const ex = { id: "bench", name: "Bench", repRange: [6, 8] };
const day = (dayType: string) => ({ dayType, exercises: [ex] });
const program = [{ week: 1, days: [day("upper-a"), day("lower-a"), day("push")] }] as unknown as WeekSchedule[];
vi.mock("@/context/ProgramContext", () => ({ useProgramContext: () => ({ program }) }));

import MyProgram from "@/app/(main)/program/page";
import { localYmd } from "@/lib/dates";

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
  db.getPreferences.mockResolvedValue({ unit: "kg", alternateSelections: {}, exerciseNotes: {}, heightCm: 180, weekStartsOn: 1 });
  db.upsertPreferences.mockResolvedValue(undefined);
  db.getLatestBodyWeight.mockResolvedValue({ loggedOn: "2026-11-09", weightKg: 80, source: "manual" });
  db.logBodyWeight.mockResolvedValue(undefined);
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

  it("shows the latest weigh-in, and logs a new one for today when it's changed", async () => {
    await renderPage();
    openSettings();
    const input = screen.getByLabelText("Body weight (kg)");
    expect(input).toHaveValue(80);
    fireEvent.change(input, { target: { value: "82.5" } });
    fireEvent.blur(input);
    await waitFor(() => expect(db.logBodyWeight).toHaveBeenCalledWith("user-1", localYmd(new Date()), 82.5));
    expect(db.upsertPreferences).not.toHaveBeenCalled();
  });

  it("shows and takes body weight in lbs for lbs users, storing kg", async () => {
    db.getPreferences.mockResolvedValue({ unit: "lbs", alternateSelections: {}, exerciseNotes: {}, heightCm: 180, weekStartsOn: 1 });
    await renderPage();
    openSettings();
    const input = screen.getByLabelText("Body weight (lbs)");
    expect(input).toHaveValue(176.25); // 80kg
    fireEvent.change(input, { target: { value: "176.37" } });
    fireEvent.blur(input);
    await waitFor(() => expect(db.logBodyWeight).toHaveBeenCalled());
    expect(db.logBodyWeight.mock.calls[0][2]).toBeCloseTo(80, 2);
  });

  it("saves height on its own", async () => {
    await renderPage();
    openSettings();
    const input = screen.getByLabelText("Height (cm)");
    fireEvent.change(input, { target: { value: "182" } });
    fireEvent.blur(input);
    await waitFor(() => expect(db.upsertPreferences).toHaveBeenCalledWith("user-1", { heightCm: 182 }));
  });

  it("saves the first day of the week", async () => {
    await renderPage();
    openSettings();
    expect(screen.getByLabelText("Week starts on")).toHaveValue("1");
    fireEvent.change(screen.getByLabelText("Week starts on"), { target: { value: "0" } });
    await waitFor(() => expect(db.upsertPreferences).toHaveBeenCalledWith("user-1", { weekStartsOn: 0 }));
    expect(screen.getByLabelText("Week starts on")).toHaveValue("0");
  });

  it("does not save when a field is left unchanged", async () => {
    await renderPage();
    openSettings();
    fireEvent.blur(screen.getByLabelText("Height (cm)"));
    fireEvent.blur(screen.getByLabelText("Body weight (kg)"));
    expect(db.upsertPreferences).not.toHaveBeenCalled();
    expect(db.logBodyWeight).not.toHaveBeenCalled();
  });

  it("reverts the body weight and shows an alert when logging it fails", async () => {
    db.logBodyWeight.mockRejectedValue(new Error("offline"));
    await renderPage();
    openSettings();
    const input = screen.getByLabelText("Body weight (kg)");
    fireEvent.change(input, { target: { value: "90" } });
    fireEvent.blur(input);
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't save your body weight");
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
