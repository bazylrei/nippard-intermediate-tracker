import { describe, it, expect } from "vitest";
import { authErrorMessage, providerReturnError } from "@/lib/auth-errors";

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

describe("providerReturnError", () => {
  it("says nothing went wrong when there's no error in the address", () => {
    expect(providerReturnError({ search: "", hash: "" })).toBeNull();
    expect(providerReturnError({ search: "?code=abc123", hash: "" })).toBeNull();
  });

  it("says sign-in was cancelled when the person backed out on the provider's screen", () => {
    expect(providerReturnError({ search: "?error=access_denied&error_code=access_denied", hash: "" })).toBe("Sign-in was cancelled.");
    expect(providerReturnError({ search: "", hash: "#error=access_denied" })).toBe("Sign-in was cancelled.");
  });

  it("gives a plain message for any other failure, not the provider's technical wording", () => {
    const message = providerReturnError({ search: "?error=server_error&error_description=Unable+to+exchange+external+code", hash: "" });
    expect(message).toBe("Couldn't sign you in with that account. Try again, or use your email instead.");
    expect(message).not.toContain("exchange");
  });

  it("reads the error from the hash too", () => {
    expect(providerReturnError({ search: "", hash: "#error=server_error&error_description=boom" })).toContain("Couldn't sign you in");
  });
});
