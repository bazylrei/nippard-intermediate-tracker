import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";

const router = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
const auth = vi.hoisted(() => ({ getSignedInUser: vi.fn(), onSignedInChange: vi.fn() }));
vi.mock("@/lib/auth", () => auth);

import AuthCallbackPage from "@/app/auth/callback/page";

let signedInListener: (signedIn: boolean) => void = () => {};

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.spyOn(console, "error").mockImplementation(() => {});
  auth.onSignedInChange.mockImplementation((cb) => { signedInListener = cb; return vi.fn(); });
  auth.getSignedInUser.mockResolvedValue(null);
});
afterEach(() => {
  vi.useRealTimers();
  window.history.replaceState({}, "", "/");
});

/** Opens the page as the provider's return would, at the given address. */
async function openAt(address: string) {
  window.history.replaceState({}, "", address);
  await act(async () => { render(<AuthCallbackPage />); });
}

describe("Auth callback page", () => {
  it("shows that it's signing the person in while it waits", async () => {
    await openAt("/auth/callback?code=abc");
    expect(screen.getByText("Signing you in…")).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("goes Home once the return has signed them in, leaving onboarding to the gate", async () => {
    await openAt("/auth/callback?code=abc");
    await act(async () => { signedInListener(true); });
    expect(router.replace).toHaveBeenCalledWith("/");
  });

  it("goes Home straight away when they're already signed in", async () => {
    auth.getSignedInUser.mockResolvedValue({ id: "user-1" });
    await openAt("/auth/callback?code=abc");
    expect(router.replace).toHaveBeenCalledWith("/");
  });

  it("says sign-in was cancelled when the person backed out on the provider's screen", async () => {
    await openAt("/auth/callback?error=access_denied&error_description=User+cancelled");
    expect(screen.getByRole("heading", { name: "Couldn't sign you in" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Sign-in was cancelled.");
    expect(screen.getByRole("link", { name: "Back to sign in" })).toHaveAttribute("href", "/auth");
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("gives a plain message for another failure, from the query or the hash", async () => {
    await openAt("/auth/callback#error=server_error&error_description=boom");
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't sign you in with that account");
    expect(screen.getByRole("alert")).not.toHaveTextContent("boom");
  });

  it("doesn't go Home on a provider error, even if someone happens to be signed in", async () => {
    auth.getSignedInUser.mockResolvedValue({ id: "user-1" });
    await openAt("/auth/callback?error=access_denied");
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("explains instead of waiting forever when no session arrives", async () => {
    await openAt("/auth/callback?code=abc");
    await act(async () => { vi.advanceTimersByTime(4000); });
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't sign you in. Try again, or use your email instead.");
    expect(screen.getByRole("link", { name: "Back to sign in" })).toBeInTheDocument();
  });
});
