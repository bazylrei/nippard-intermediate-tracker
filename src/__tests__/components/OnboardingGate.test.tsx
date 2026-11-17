import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
const auth = vi.hoisted(() => ({ getSignedInUser: vi.fn() }));
vi.mock("@/lib/auth", () => auth);
const onboarding = vi.hoisted(() => ({ checkOnboarded: vi.fn() }));
vi.mock("@/lib/onboarding", () => ({ ...onboarding, ONBOARDING_PATH: "/onboarding" }));

import OnboardingGate from "@/components/OnboardingGate";

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  auth.getSignedInUser.mockResolvedValue({ id: "user-1" });
  onboarding.checkOnboarded.mockResolvedValue(true);
});

const renderGate = () => render(<OnboardingGate><p>Home</p></OnboardingGate>);

describe("OnboardingGate", () => {
  it("sends an account that hasn't finished onboarding to it", async () => {
    onboarding.checkOnboarded.mockResolvedValue(false);
    renderGate();
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/onboarding"));
    expect(onboarding.checkOnboarded).toHaveBeenCalledWith("user-1");
  });

  it("leaves an onboarded account where it is", async () => {
    renderGate();
    await waitFor(() => expect(onboarding.checkOnboarded).toHaveBeenCalled());
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("doesn't hold the page back while it checks", () => {
    onboarding.checkOnboarded.mockReturnValue(new Promise(() => {}));
    renderGate();
    expect(screen.getByText("Home")).toBeInTheDocument();
  });

  it("does nothing for a signed-out visitor: the page sends them to sign in", async () => {
    auth.getSignedInUser.mockResolvedValue(null);
    renderGate();
    await waitFor(() => expect(auth.getSignedInUser).toHaveBeenCalled());
    expect(onboarding.checkOnboarded).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("leaves the user in the app when the check fails, rather than locking them out", async () => {
    onboarding.checkOnboarded.mockRejectedValue(new Error("offline"));
    renderGate();
    await waitFor(() => expect(console.error).toHaveBeenCalled());
    expect(router.replace).not.toHaveBeenCalled();
    expect(screen.getByText("Home")).toBeInTheDocument();
  });
});
