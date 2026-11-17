import { describe, it, expect } from "vitest";
import { authErrorMessage } from "@/lib/auth-errors";

const withCode = (code: string, message = "raw message") => Object.assign(new Error(message), { code });

describe("authErrorMessage", () => {
  it.each([
    ["invalid_credentials", "Wrong email or password."],
    ["email_not_confirmed", "Confirm your email first: open the link we sent you."],
    ["user_already_exists", "That email already has an account. Try signing in."],
    ["email_exists", "That email already has an account. Try signing in."],
    ["email_address_invalid", "Enter a valid email address."],
    ["over_email_send_rate_limit", "Too many tries. Wait a few minutes and try again."],
    ["same_password", "Choose a password you haven't used before."],
  ])("explains %s plainly", (code, message) => {
    expect(authErrorMessage(withCode(code))).toBe(message);
  });

  it("passes on the reason a password is too weak, since it depends on the project's rules", () => {
    expect(authErrorMessage(withCode("weak_password", "Password should be at least 10 characters."))).toBe("Password should be at least 10 characters.");
    expect(authErrorMessage(withCode("weak_password", ""))).toBe("Choose a stronger password.");
  });

  it("says when the server can't be reached", () => {
    const offline = Object.assign(new Error("fetch failed"), { name: "AuthRetryableFetchError" });
    expect(authErrorMessage(offline)).toBe("Couldn't reach the server. Check your connection and try again.");
  });

  it("falls back to the error's own message, then a generic one", () => {
    expect(authErrorMessage(new Error("Something odd"))).toBe("Something odd");
    expect(authErrorMessage(new Error(""))).toBe("Something went wrong. Try again.");
    expect(authErrorMessage(undefined)).toBe("Something went wrong. Try again.");
    expect(authErrorMessage("nope")).toBe("Something went wrong. Try again.");
  });
});
