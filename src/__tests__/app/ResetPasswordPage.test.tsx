import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

const router = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const auth = vi.hoisted(() => ({ getSignedInUser: vi.fn(), onSignedInChange: vi.fn(), updatePassword: vi.fn() }));
vi.mock("@/lib/auth", () => auth);

import ResetPasswordPage from "@/app/auth/reset/page";

let signedInListener: (signedIn: boolean) => void = () => {};
const stopListening = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.spyOn(console, "error").mockImplementation(() => {});
  signedInListener = () => {};
  auth.onSignedInChange.mockImplementation((cb) => { signedInListener = cb; return stopListening; });
  auth.getSignedInUser.mockResolvedValue({ id: "user-1" });
  auth.updatePassword.mockResolvedValue(undefined);
});
afterEach(() => { vi.useRealTimers(); });

async function renderPage() {
  await act(async () => { render(<ResetPasswordPage />); });
}
const newPassword = () => screen.getByLabelText("New password");
const save = () => screen.getByRole("button", { name: "Save password" });

describe("Reset password page", () => {
  it("lets the person choose a new password once the emailed link has signed them in", async () => {
    await renderPage();
    expect(screen.getByRole("heading", { name: "Choose a new password" })).toBeInTheDocument();
  });

  it("waits for the link to sign them in, then shows the form", async () => {
    auth.getSignedInUser.mockResolvedValue(null);
    await renderPage();
    expect(screen.getByText("Checking your link…")).toBeInTheDocument();

    await act(async () => { signedInListener(true); });
    expect(screen.getByRole("heading", { name: "Choose a new password" })).toBeInTheDocument();
  });

  it("says the link didn't work when no one is signed in after a few seconds, and leads back to sign in", async () => {
    auth.getSignedInUser.mockResolvedValue(null);
    await renderPage();
    await act(async () => { vi.advanceTimersByTime(4000); });

    expect(screen.getByRole("heading", { name: "This link didn't work" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to sign in" })).toHaveAttribute("href", "/auth");
  });

  it("still lets a slow link through after it was called unusable", async () => {
    auth.getSignedInUser.mockResolvedValue(null);
    await renderPage();
    await act(async () => { vi.advanceTimersByTime(4000); });
    await act(async () => { signedInListener(true); });
    expect(screen.getByRole("heading", { name: "Choose a new password" })).toBeInTheDocument();
  });

  it("needs at least 8 characters", async () => {
    await renderPage();
    expect(save()).toBeDisabled();
    fireEvent.change(newPassword(), { target: { value: "short" } });
    expect(save()).toBeDisabled();
    fireEvent.change(newPassword(), { target: { value: "longenough" } });
    expect(save()).toBeEnabled();
  });

  it("saves the new password and goes into the app", async () => {
    await renderPage();
    fireEvent.change(newPassword(), { target: { value: "newpassword1" } });
    await act(async () => { fireEvent.click(save()); });

    expect(auth.updatePassword).toHaveBeenCalledWith("newpassword1");
    expect(router.replace).toHaveBeenCalledWith("/");
  });

  it("says why when the password can't be saved, and lets them try again", async () => {
    auth.updatePassword.mockRejectedValue(Object.assign(new Error("x"), { code: "same_password" }));
    await renderPage();
    fireEvent.change(newPassword(), { target: { value: "newpassword1" } });
    await act(async () => { fireEvent.click(save()); });

    expect(screen.getByRole("alert")).toHaveTextContent("Choose a password you haven't used before.");
    expect(router.replace).not.toHaveBeenCalled();
    expect(save()).toBeEnabled();
  });

  it("stops listening for the link when the page goes away", async () => {
    let unmount: () => void = () => {};
    await act(async () => { ({ unmount } = render(<ResetPasswordPage />)); });
    expect(stopListening).not.toHaveBeenCalled();
    unmount();
    expect(stopListening).toHaveBeenCalled();
  });
});
