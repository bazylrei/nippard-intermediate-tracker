import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { WeekSchedule } from "@/lib/types";

const router = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
const auth = vi.hoisted(() => ({ getSignedInUser: vi.fn(), signOut: vi.fn() }));
vi.mock("@/lib/auth", () => auth);

const day = { dayType: "push", exercises: [] };
const program = [{ week: 1, days: [day, day] }, { week: 2, days: [day, day] }] as unknown as WeekSchedule[];
vi.mock("@/context/ProgramContext", () => ({ useProgramContext: () => ({ program }) }));

import ProfilePage from "@/app/(main)/profile/page";
import { ACTIVE_PROGRAM_NAME } from "@/lib/program-db";

beforeEach(() => {
  vi.clearAllMocks();
  auth.getSignedInUser.mockResolvedValue({ id: "user-1", email: "me@example.com" });
  auth.signOut.mockResolvedValue(undefined);
});

describe("Profile page", () => {
  it("shows who is signed in", async () => {
    render(<ProfilePage />);
    expect(await screen.findByText("me@example.com")).toBeInTheDocument();
  });

  it("sends a signed-out visitor to sign in", async () => {
    auth.getSignedInUser.mockResolvedValue(null);
    render(<ProfilePage />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/auth"));
  });

  it("links to the current program, my programs, exercises and settings", () => {
    render(<ProfilePage />);
    const link = (name: RegExp) => screen.getByRole("link", { name });
    expect(link(new RegExp(ACTIVE_PROGRAM_NAME))).toHaveAttribute("href", "/program");
    expect(link(/My programs/)).toHaveAttribute("href", "/programs");
    expect(link(/Settings/)).toHaveAttribute("href", "/settings");
    expect(link(/^Exercises/)).toHaveAttribute("href", "/exercises");
  });

  it("sizes the current program from the loaded schedule", () => {
    render(<ProfilePage />);
    expect(screen.getByText("2 weeks · 4 workouts")).toBeInTheDocument();
  });

  it("signs out through lib/auth and goes to the sign-in page", async () => {
    render(<ProfilePage />);
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/auth"));
    expect(auth.signOut).toHaveBeenCalled();
  });

  it("stays put and shows an alert when signing out fails", async () => {
    auth.signOut.mockRejectedValue(new Error("offline"));
    render(<ProfilePage />);
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't sign out");
    expect(router.replace).not.toHaveBeenCalledWith("/auth");
  });
});
