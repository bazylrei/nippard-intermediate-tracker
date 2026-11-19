import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@/test-utils/render";

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const auth = vi.hoisted(() => ({
  onAuthUserChange: () => () => {}, getSignedInUser: vi.fn(), signIn: vi.fn(), signUp: vi.fn(), resendConfirmation: vi.fn(), sendPasswordReset: vi.fn(),
  signInWithProvider: vi.fn(), getEnabledSocialProviders: vi.fn(),
}));
vi.mock("@/lib/auth", () => auth);

import AuthPage from "@/app/auth/page";

const authError = (code: string, message = "raw") => Object.assign(new Error(message), { code });

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  auth.getSignedInUser.mockResolvedValue(null);
  auth.signIn.mockResolvedValue(undefined);
  auth.signUp.mockResolvedValue({ confirmationNeeded: false });
  auth.resendConfirmation.mockResolvedValue(undefined);
  auth.sendPasswordReset.mockResolvedValue(undefined);
  auth.signInWithProvider.mockResolvedValue(undefined);
  auth.getEnabledSocialProviders.mockResolvedValue([]);
});

async function renderPage() {
  await act(async () => { render(<AuthPage />); });
}
const press = (name: string | RegExp) => act(async () => { fireEvent.click(screen.getByRole("button", { name })); });
const type = (label: string | RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

async function openSignUp() {
  await renderPage();
  await press("Create account");
}
async function openSignIn() {
  await renderPage();
  await press("I already have an account");
}
const fillAndSubmit = async (submit: string, email = "me@example.com", password = "password1") => {
  type("Email", email);
  type("Password", password);
  await press(submit);
};

describe("Auth — welcome", () => {
  it("opens on a welcome, offering to create an account or sign in", async () => {
    await renderPage();
    expect(screen.getByRole("heading", { name: "Welcome" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create account" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "I already have an account" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
  });

  it("sends someone who is already signed in Home", async () => {
    auth.getSignedInUser.mockResolvedValue({ id: "user-1" });
    await renderPage();
    expect(router.replace).toHaveBeenCalledWith("/");
  });
});

describe("Auth — Google", () => {
  const googleButton = () => screen.getByRole("button", { name: /Continue with Google/ });

  it("is offered on the create-account and sign-in forms once switched on", async () => {
    auth.getEnabledSocialProviders.mockResolvedValue(["google"]);
    await openSignUp();
    expect(googleButton()).toBeInTheDocument();
    await press("Have an account? Sign in");
    expect(googleButton()).toBeInTheDocument();
  });

  it("isn't on the welcome screen, which keeps its two buttons", async () => {
    auth.getEnabledSocialProviders.mockResolvedValue(["google"]);
    await renderPage();
    expect(screen.queryByRole("button", { name: /Continue with Google/ })).toBeNull();
  });

  it("starts signing in with Google when pressed", async () => {
    auth.getEnabledSocialProviders.mockResolvedValue(["google"]);
    await openSignIn();
    await press(/Continue with Google/);
    expect(auth.signInWithProvider).toHaveBeenCalledWith("google");
    expect(router.push).not.toHaveBeenCalled(); // the browser leaves for Google; nothing to route
  });

  it("doesn't appear while Google is off, leaving the email form alone", async () => {
    await openSignUp();
    expect(screen.queryByRole("button", { name: /Continue with Google/ })).toBeNull();
    expect(screen.getByRole("form", { name: "Create your account" })).toBeInTheDocument();
  });
});

describe("Auth — light and dark", () => {
  const toggle = () => screen.getByRole("button", { name: /^Switch to (light|dark) mode$/ });

  it("offers a light/dark button on the welcome, before there's an account", async () => {
    await renderPage();
    expect(toggle()).toBeInTheDocument();
  });

  it("flips the page and remembers it on this device", async () => {
    document.documentElement.className = "";
    localStorage.clear();
    await renderPage();
    const before = toggle().getAttribute("aria-label");
    fireEvent.click(toggle());

    const now = before === "Switch to dark mode" ? "dark" : "light";
    expect(document.documentElement).toHaveClass(now);
    expect(toggle().getAttribute("aria-label")).not.toBe(before);
  });

  it("stays available on every account screen", async () => {
    await openSignUp();
    expect(toggle()).toBeInTheDocument();
    await press("Have an account? Sign in");
    expect(toggle()).toBeInTheDocument();
    await press("Forgot password?");
    expect(toggle()).toBeInTheDocument();
  });
});

describe("Auth — creating an account", () => {
  it("needs an email and a password of at least 8 characters", async () => {
    await openSignUp();
    const submit = () => screen.getByRole("button", { name: "Create account" });
    expect(screen.getByText("At least 8 characters")).toBeInTheDocument();
    expect(submit()).toBeDisabled();
    type("Email", "me@example.com");
    type("Password", "short");
    expect(submit()).toBeDisabled();
    type("Password", "longenough");
    expect(submit()).toBeEnabled();
  });

  it("goes into the app when sign-up signs the person straight in", async () => {
    await openSignUp();
    await fillAndSubmit("Create account");
    expect(auth.signUp).toHaveBeenCalledWith("me@example.com", "password1");
    expect(router.push).toHaveBeenCalledWith("/");
    expect(router.refresh).toHaveBeenCalled();
  });

  it("asks them to check their email when the account needs confirming", async () => {
    auth.signUp.mockResolvedValue({ confirmationNeeded: true });
    await openSignUp();
    await fillAndSubmit("Create account");

    expect(screen.getByRole("heading", { name: "Check your email" })).toBeInTheDocument();
    expect(screen.getByText("me@example.com")).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("explains a failure in plain words and lets them try again", async () => {
    auth.signUp.mockRejectedValue(authError("user_already_exists"));
    await openSignUp();
    await fillAndSubmit("Create account");

    expect(screen.getByRole("alert")).toHaveTextContent("That email already has an account. Try signing in.");
    expect(screen.getByRole("button", { name: "Create account" })).toBeEnabled();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("creates the account once however often the button is pressed", async () => {
    let resolve: (v: { confirmationNeeded: boolean }) => void = () => {};
    auth.signUp.mockReturnValue(new Promise((r) => { resolve = r; }));
    await openSignUp();
    type("Email", "me@example.com");
    type("Password", "password1");
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    fireEvent.click(screen.getByRole("button", { name: "…" }));
    await act(async () => { resolve({ confirmationNeeded: false }); });
    expect(auth.signUp).toHaveBeenCalledTimes(1);
  });
});

describe("Auth — signing in", () => {
  it("signs in and goes into the app", async () => {
    await openSignIn();
    await fillAndSubmit("Sign in", "me@example.com", "pw");
    expect(auth.signIn).toHaveBeenCalledWith("me@example.com", "pw");
    expect(router.push).toHaveBeenCalledWith("/");
  });

  it("doesn't hold an older, shorter password to the new length rule", async () => {
    await openSignIn();
    type("Email", "me@example.com");
    type("Password", "abc");
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
  });

  it("says plainly when the email or password is wrong", async () => {
    auth.signIn.mockRejectedValue(authError("invalid_credentials"));
    await openSignIn();
    await fillAndSubmit("Sign in");
    expect(screen.getByRole("alert")).toHaveTextContent("Wrong email or password.");
    expect(router.push).not.toHaveBeenCalled();
  });

  it("points someone who hasn't confirmed their email to the email", async () => {
    auth.signIn.mockRejectedValue(authError("email_not_confirmed"));
    await openSignIn();
    await fillAndSubmit("Sign in");
    expect(screen.getByRole("heading", { name: "Check your email" })).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("switches between signing in and creating an account, keeping the email typed", async () => {
    await openSignIn();
    type("Email", "me@example.com");
    await press("No account? Create one");
    expect(screen.getByRole("form", { name: "Create your account" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveValue("me@example.com");
    await press("Have an account? Sign in");
    expect(screen.getByRole("form", { name: "Welcome back" })).toBeInTheDocument();
  });

  it("shows and hides the password", async () => {
    await openSignIn();
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "text");
    fireEvent.click(screen.getByRole("button", { name: "Hide password" }));
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
  });
});

describe("Auth — forgotten password", () => {
  async function openForgot(email = "me@example.com") {
    await openSignIn();
    type("Email", email);
    await press("Forgot password?");
  }

  it("emails a reset link to the address already typed, and says to check email", async () => {
    await openForgot();
    expect(screen.getByLabelText("Email")).toHaveValue("me@example.com");
    await press("Send reset link");

    expect(auth.sendPasswordReset).toHaveBeenCalledWith("me@example.com");
    expect(screen.getByRole("heading", { name: "Check your email" })).toBeInTheDocument();
    expect(screen.getByText(/choose a new password/)).toBeInTheDocument();
  });

  it("stays on the form with a message when it can't be sent", async () => {
    auth.sendPasswordReset.mockRejectedValue(authError("over_email_send_rate_limit"));
    await openForgot();
    await press("Send reset link");
    expect(screen.getByRole("alert")).toHaveTextContent("Too many tries");
    expect(screen.getByRole("heading", { name: "Reset your password" })).toBeInTheDocument();
  });

  it("needs an email to send to", async () => {
    await openForgot("");
    expect(screen.getByRole("button", { name: "Send reset link" })).toBeDisabled();
  });
});

describe("Auth — the email notice", () => {
  async function openConfirmNotice() {
    auth.signUp.mockResolvedValue({ confirmationNeeded: true });
    await openSignUp();
    await fillAndSubmit("Create account");
  }

  it("sends the confirmation email again, and says so", async () => {
    await openConfirmNotice();
    await press("Send it again");
    expect(auth.resendConfirmation).toHaveBeenCalledWith("me@example.com");
    expect(screen.getByRole("status")).toHaveTextContent("Sent again.");
  });

  it("sends the reset email again for a reset", async () => {
    await openSignIn();
    type("Email", "me@example.com");
    await press("Forgot password?");
    await press("Send reset link");
    await press("Send it again");
    expect(auth.sendPasswordReset).toHaveBeenCalledTimes(2);
    expect(auth.resendConfirmation).not.toHaveBeenCalled();
  });

  it("says why when it can't be sent again", async () => {
    auth.resendConfirmation.mockRejectedValue(authError("over_email_send_rate_limit"));
    await openConfirmNotice();
    await press("Send it again");
    expect(screen.getByRole("alert")).toHaveTextContent("Too many tries");
  });

  it("goes back to sign in", async () => {
    await openConfirmNotice();
    await press("Back to sign in");
    expect(screen.getByRole("form", { name: "Welcome back" })).toBeInTheDocument();
  });
});

describe("Auth — the back arrow", () => {
  it("leads from a form back to the welcome", async () => {
    await openSignUp();
    await press("Back");
    expect(screen.getByRole("heading", { name: "Welcome" })).toBeInTheDocument();
  });

  it("leads from forgot-password back to sign in", async () => {
    await openSignIn();
    await press("Forgot password?");
    await press("Back");
    expect(screen.getByRole("form", { name: "Welcome back" })).toBeInTheDocument();
  });
});
