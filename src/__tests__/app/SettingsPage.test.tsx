import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@/test-utils/render";

const router = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
const auth = vi.hoisted(() => ({ onAuthUserChange: () => () => {}, getSignedInUser: vi.fn() }));
vi.mock("@/lib/auth", () => auth);

const db = vi.hoisted(() => ({
  getPreferences: vi.fn(),
  upsertPreferences: vi.fn(),
  getLatestBodyWeight: vi.fn(),
  logBodyWeight: vi.fn(),
}));
vi.mock("@/lib/db", () => db);

import SettingsPage from "@/app/(main)/settings/page";
import { localYmd } from "@/lib/dates";

const prefs = (over = {}) => ({ unit: "kg", alternateSelections: {}, exerciseNotes: {}, heightCm: 180, weekStartsOn: 1, ...over });

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  vi.spyOn(console, "error").mockImplementation(() => {});
  auth.getSignedInUser.mockResolvedValue({ id: "user-1", email: "me@example.com" });
  db.getPreferences.mockResolvedValue(prefs());
  db.upsertPreferences.mockResolvedValue(undefined);
  db.getLatestBodyWeight.mockResolvedValue({ loggedOn: "2026-11-09", weightKg: 80, source: "manual" });
  db.logBodyWeight.mockResolvedValue(undefined);
});

async function renderPage() {
  render(<SettingsPage />);
  await screen.findByRole("heading", { name: "Settings" });
}

describe("Settings page — loading", () => {
  it("leads back to Profile, which it is opened from", async () => {
    await renderPage();
    expect(screen.getByRole("link", { name: "Back to Profile" })).toHaveAttribute("href", "/profile");
  });

  it("shows the settings once preferences and the latest weigh-in have loaded", async () => {
    await renderPage();
    expect(screen.getByRole("radiogroup", { name: "Weight unit" })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "Theme" })).toBeInTheDocument();
    expect(screen.getByLabelText("Week starts on")).toHaveValue("1");
    expect(screen.getByLabelText("Body weight (kg)")).toHaveValue(80);
    expect(screen.getByLabelText("Height (cm)")).toHaveValue(180);
  });

  it("loads preferences and the weigh-in together, for the signed-in user", async () => {
    await renderPage();
    expect(db.getPreferences).toHaveBeenCalledExactlyOnceWith("user-1");
    expect(db.getLatestBodyWeight).toHaveBeenCalledExactlyOnceWith("user-1");
  });

  it("explains instead of loading forever when loading fails", async () => {
    db.getPreferences.mockRejectedValue(new Error("offline"));
    render(<SettingsPage />);
    expect(await screen.findByText(/Couldn't load your settings/)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Settings" })).toBeNull();
  });

  it("sends a signed-out visitor to sign in without loading anything", async () => {
    auth.getSignedInUser.mockResolvedValue(null);
    render(<SettingsPage />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/auth"));
    expect(db.getPreferences).not.toHaveBeenCalled();
  });
});

describe("Settings page — saving", () => {
  it("toggles the unit and saves it through the DB layer", async () => {
    await renderPage();
    fireEvent.click(screen.getByRole("radio", { name: "LBS" }));
    expect(screen.getByRole("radio", { name: "LBS" })).toHaveAttribute("aria-checked", "true");
    await waitFor(() => expect(db.upsertPreferences).toHaveBeenCalledWith("user-1", { unit: "lbs" }));
  });

  it("doesn't save anything when the current unit is tapped again", async () => {
    await renderPage();
    fireEvent.click(screen.getByRole("radio", { name: "KG" }));
    expect(db.upsertPreferences).not.toHaveBeenCalled();
  });

  it("reverts the unit and shows an alert when the save fails", async () => {
    db.upsertPreferences.mockRejectedValue(new Error("offline"));
    await renderPage();
    fireEvent.click(screen.getByRole("radio", { name: "LBS" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't change the weight unit");
    expect(screen.getByRole("radio", { name: "KG" })).toHaveAttribute("aria-checked", "true");
  });

  it("remembers the unit on this device so other screens start with it", async () => {
    await renderPage();
    fireEvent.click(screen.getByRole("radio", { name: "LBS" }));
    expect(JSON.parse(localStorage.getItem("workout_cache_prefs")!).unit).toBe("lbs");
  });

  it("logs a new weigh-in for today when the body weight is changed", async () => {
    await renderPage();
    const input = screen.getByLabelText("Body weight (kg)");
    fireEvent.change(input, { target: { value: "82.5" } });
    fireEvent.blur(input);
    await waitFor(() => expect(db.logBodyWeight).toHaveBeenCalledWith("user-1", localYmd(new Date()), 82.5));
    expect(db.upsertPreferences).not.toHaveBeenCalled();
  });

  it("shows and takes body weight in lbs for lbs users, storing kg", async () => {
    db.getPreferences.mockResolvedValue(prefs({ unit: "lbs" }));
    await renderPage();
    const input = screen.getByLabelText("Body weight (lbs)");
    expect(input).toHaveValue(176.25); // 80kg
    fireEvent.change(input, { target: { value: "176.37" } });
    fireEvent.blur(input);
    await waitFor(() => expect(db.logBodyWeight).toHaveBeenCalled());
    expect(db.logBodyWeight.mock.calls[0][2]).toBeCloseTo(80, 2);
  });

  it("saves height on its own", async () => {
    await renderPage();
    const input = screen.getByLabelText("Height (cm)");
    fireEvent.change(input, { target: { value: "182" } });
    fireEvent.blur(input);
    await waitFor(() => expect(db.upsertPreferences).toHaveBeenCalledWith("user-1", { heightCm: 182 }));
  });

  it("saves the first day of the week", async () => {
    await renderPage();
    fireEvent.change(screen.getByLabelText("Week starts on"), { target: { value: "0" } });
    await waitFor(() => expect(db.upsertPreferences).toHaveBeenCalledWith("user-1", { weekStartsOn: 0 }));
    expect(screen.getByLabelText("Week starts on")).toHaveValue("0");
  });

  it("does not save when a field is left unchanged", async () => {
    await renderPage();
    fireEvent.blur(screen.getByLabelText("Height (cm)"));
    fireEvent.blur(screen.getByLabelText("Body weight (kg)"));
    expect(db.upsertPreferences).not.toHaveBeenCalled();
    expect(db.logBodyWeight).not.toHaveBeenCalled();
  });

  it("reverts the body weight and shows an alert when logging it fails", async () => {
    db.logBodyWeight.mockRejectedValue(new Error("offline"));
    await renderPage();
    const input = screen.getByLabelText("Body weight (kg)");
    fireEvent.change(input, { target: { value: "90" } });
    fireEvent.blur(input);
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't save your body weight");
    expect(screen.getByLabelText("Body weight (kg)")).toHaveValue(80);
  });
});
