import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import type { WeekSchedule } from "@/lib/types";
import { localYmd } from "@/lib/dates";
import { readCachedPrefs } from "@/lib/prefs-cache";

const router = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
const auth = vi.hoisted(() => ({ getSignedInUser: vi.fn() }));
vi.mock("@/lib/auth", () => auth);

const db = vi.hoisted(() => ({
  isOnboarded: vi.fn(), completeOnboarding: vi.fn(), getPreferences: vi.fn(), upsertPreferences: vi.fn(), logBodyWeight: vi.fn(),
  getPrograms: vi.fn(),
}));
vi.mock("@/lib/db", () => db);

const day = (dayType: string) => ({ dayType, exercises: [] });
let program: WeekSchedule[] = [];
/** Following resolves with the followed program's schedule, as the context's does. */
const followProgram = vi.hoisted(() => vi.fn());
vi.mock("@/context/ProgramContext", () => ({ useProgramContext: () => ({ followProgram }) }));

const nippard = {
  id: "nippard", name: "Nippard Intermediate", description: "Hypertrophy, 5 days a week", category: null,
  totalWeeks: 12, createdBy: "coach", isPublic: true, createdAt: "2026-01-01", userCount: 3,
};
const other = { ...nippard, id: "ppl", name: "Push Pull Legs", description: null, totalWeeks: 8 };

import OnboardingPage from "@/app/onboarding/page";

const prefs = { unit: "kg", weekStartsOn: 1, alternateSelections: {}, exerciseNotes: {}, heightCm: null };

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  document.documentElement.className = "";
  vi.spyOn(console, "error").mockImplementation(() => {});
  auth.getSignedInUser.mockResolvedValue({ id: "user-1" });
  db.isOnboarded.mockResolvedValue(false);
  db.getPreferences.mockResolvedValue(prefs);
  for (const fn of [db.completeOnboarding, db.upsertPreferences, db.logBodyWeight]) fn.mockResolvedValue(undefined);
  program = [
    { week: 1, days: [day("upper-a"), day("lower-a")] },
    { week: 2, days: [day("upper-a"), day("lower-a")] },
  ] as unknown as WeekSchedule[];
  db.getPrograms.mockResolvedValue([nippard, other]);
  followProgram.mockImplementation(async (id: string | null) => (id ? program : []));
});

async function renderPage() {
  await act(async () => { render(<OnboardingPage />); });
}
const press = (name: string | RegExp) => act(async () => { fireEvent.click(screen.getByRole("button", { name })); });
const dots = () => screen.getByRole("img", { name: /^Step \d of \d$/ }).getAttribute("aria-label");

/** Opens the flow (on units) and presses through to the given step. */
async function goTo(step: "units" | "weight" | "program") {
  await renderPage();
  if (step === "units") return;
  await press("Next");
  if (step === "weight") return;
  await press("Skip for now");
}

describe("Onboarding — the steps", () => {
  it("opens on units, with the steps shown as dots", async () => {
    await renderPage();
    expect(screen.getByRole("heading", { name: "Set it up your way" })).toBeInTheDocument();
    expect(dots()).toBe("Step 1 of 3");
  });

  it("moves through units, body weight and program, and back", async () => {
    await goTo("units");
    await press("Next");
    expect(screen.getByRole("heading", { name: "What do you weigh?" })).toBeInTheDocument();
    expect(dots()).toBe("Step 2 of 3");

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { name: "Set it up your way" })).toBeInTheDocument();
  });

  it("has no back button on the first step or the last", async () => {
    await renderPage();
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
    await press("Next");
    await press("Skip for now");
    expect(screen.getByRole("heading", { name: "Pick your program" })).toBeInTheDocument();
    expect(dots()).toBe("Step 3 of 3");
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
  });
});

describe("Onboarding — units and week start", () => {
  it("starts on what's saved: kg and a Monday week for a new account", async () => {
    await goTo("units");
    expect(screen.getByRole("radio", { name: "KG" })).toBeChecked();
    expect(screen.getByLabelText("Week starts on")).toHaveValue("1");
  });

  it("starts on what the account already has", async () => {
    db.getPreferences.mockResolvedValue({ ...prefs, unit: "lbs", weekStartsOn: 0 });
    await goTo("units");
    expect(screen.getByRole("radio", { name: "LBS" })).toBeChecked();
    expect(screen.getByLabelText("Week starts on")).toHaveValue("0");
  });

  it("saves the choices, keeps them for the rest of the app, and moves on", async () => {
    await goTo("units");
    fireEvent.click(screen.getByRole("radio", { name: "LBS" }));
    fireEvent.change(screen.getByLabelText("Week starts on"), { target: { value: "0" } });
    await press("Next");

    expect(db.upsertPreferences).toHaveBeenCalledWith("user-1", { unit: "lbs", weekStartsOn: 0 });
    expect(readCachedPrefs()).toMatchObject({ unit: "lbs", weekStartsOn: 0 });
    expect(screen.getByRole("heading", { name: "What do you weigh?" })).toBeInTheDocument();
  });

  it("stays on the step, with an alert, when the choices can't be saved", async () => {
    db.upsertPreferences.mockRejectedValue(new Error("offline"));
    await goTo("units");
    await press("Next");

    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't save your settings");
    expect(screen.getByRole("heading", { name: "Set it up your way" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();
  });
});

describe("Onboarding — theme", () => {
  it("offers light, dark or the device's setting, applied at once", async () => {
    await goTo("units");
    expect(screen.getByRole("radiogroup", { name: "Theme" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "System" })).toBeChecked();

    fireEvent.click(screen.getByRole("radio", { name: "Dark" }));
    expect(document.documentElement).toHaveClass("dark");
    expect(screen.getByRole("radio", { name: "Dark" })).toBeChecked();
  });

  it("keeps the theme on this device only: it isn't part of what's saved to the account", async () => {
    await goTo("units");
    fireEvent.click(screen.getByRole("radio", { name: "Light" }));
    await press("Next");
    expect(db.upsertPreferences).toHaveBeenCalledWith("user-1", { unit: "kg", weekStartsOn: 1 });
  });
});

describe("Onboarding — body weight", () => {
  it("asks in the unit just chosen", async () => {
    await goTo("units");
    fireEvent.click(screen.getByRole("radio", { name: "LBS" }));
    await press("Next");
    expect(screen.getByLabelText("Body weight (lbs)")).toBeInTheDocument();
  });

  it("logs today's weigh-in in kg, whatever unit it was typed in, and moves on", async () => {
    await goTo("units");
    fireEvent.click(screen.getByRole("radio", { name: "LBS" }));
    await press("Next");
    fireEvent.change(screen.getByLabelText("Body weight (lbs)"), { target: { value: "176" } });
    await press("Save");

    const [userId, loggedOn, kg] = db.logBodyWeight.mock.calls[0];
    expect([userId, loggedOn]).toEqual(["user-1", localYmd(new Date())]);
    expect(kg).toBeCloseTo(79.83, 1); // 176 lbs
    expect(screen.getByRole("heading", { name: "Pick your program" })).toBeInTheDocument();
  });

  it("can be skipped, logging nothing", async () => {
    await goTo("weight");
    await press("Skip for now");
    expect(db.logBodyWeight).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Pick your program" })).toBeInTheDocument();
  });

  it("stays on the step, with the form's error, when the weight can't be saved", async () => {
    db.logBodyWeight.mockRejectedValue(new Error("offline"));
    await goTo("weight");
    fireEvent.change(screen.getByLabelText("Body weight (kg)"), { target: { value: "80" } });
    await press("Save");

    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't save your weight");
    expect(screen.getByRole("heading", { name: "What do you weigh?" })).toBeInTheDocument();
  });
});

describe("Onboarding — your program", () => {
  const option = (name: RegExp) => screen.getByRole("radio", { name });

  it("offers the programs available, and starting with none", async () => {
    await goTo("program");
    expect(option(/Nippard Intermediate/)).toHaveTextContent("12 weeks · Hypertrophy, 5 days a week");
    expect(option(/Push Pull Legs/)).toHaveTextContent("8 weeks");
    expect(option(/No program for now/)).toBeInTheDocument();
  });

  it("has the first program picked to begin with, so starting is one tap", async () => {
    await goTo("program");
    expect(option(/Nippard Intermediate/)).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("button", { name: "Start first workout" })).toBeInTheDocument();
  });

  it("follows the chosen program, finishes onboarding, then starts its first workout", async () => {
    await goTo("program");
    fireEvent.click(option(/Push Pull Legs/));
    await press("Start first workout");

    expect(followProgram).toHaveBeenCalledWith("ppl");
    expect(db.completeOnboarding).toHaveBeenCalledWith("user-1");
    expect(router.push).toHaveBeenCalledWith("/workout?week=1&day=0");
    expect(db.completeOnboarding.mock.invocationCallOrder[0]).toBeLessThan(router.push.mock.invocationCallOrder[0]);
  });

  it("can start with no program: follows none, finishes, and goes Home", async () => {
    await goTo("program");
    fireEvent.click(option(/No program for now/));
    await press("Go to Home");

    expect(followProgram).toHaveBeenCalledWith(null);
    expect(db.completeOnboarding).toHaveBeenCalledWith("user-1");
    expect(router.push).toHaveBeenCalledWith("/");
  });

  it("goes Home when the chosen program has no workouts yet", async () => {
    followProgram.mockResolvedValue([]);
    await goTo("program");
    await press("Start first workout");
    expect(router.push).toHaveBeenCalledWith("/");
  });

  it("can go and build a program instead, following none", async () => {
    await goTo("program");
    await press(/Build your own program/);
    expect(db.completeOnboarding).toHaveBeenCalledWith("user-1");
    expect(router.push).toHaveBeenCalledWith("/programs?new=1");
    expect(followProgram).not.toHaveBeenCalled();
  });

  it("stays, with an alert and onboarding unfinished, when the program can't be saved", async () => {
    followProgram.mockRejectedValueOnce(new Error("offline"));
    await goTo("program");
    await press("Start first workout");

    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't save your program");
    expect(db.completeOnboarding).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("goes nowhere, with an alert, when finishing can't be saved, and can be tried again", async () => {
    db.completeOnboarding.mockRejectedValueOnce(new Error("offline"));
    await goTo("program");
    await press("Start first workout");

    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't finish setting up");
    expect(router.push).not.toHaveBeenCalled();

    await press("Start first workout");
    expect(router.push).toHaveBeenCalledWith("/workout?week=1&day=0");
  });

  it("offers just starting with none when no programs are available", async () => {
    db.getPrograms.mockResolvedValue([]);
    await goTo("program");
    expect(screen.getAllByRole("radio")).toHaveLength(1);
    expect(option(/No program for now/)).toHaveAttribute("aria-checked", "true");
  });
});

describe("Onboarding — who sees it", () => {
  it("sends an account that has finished it Home, without showing it", async () => {
    db.isOnboarded.mockResolvedValue(true);
    await renderPage();
    expect(router.replace).toHaveBeenCalledWith("/");
    expect(screen.queryByRole("heading", { name: "Set it up your way" })).toBeNull();
  });

  it("sends a signed-out visitor to sign in", async () => {
    auth.getSignedInUser.mockResolvedValue(null);
    await renderPage();
    expect(router.replace).toHaveBeenCalledWith("/auth");
  });

  it("explains instead of loading forever when it can't load", async () => {
    db.getPreferences.mockRejectedValue(new Error("offline"));
    await renderPage();
    expect(screen.getByText(/Couldn't load/)).toBeInTheDocument();
  });
});
