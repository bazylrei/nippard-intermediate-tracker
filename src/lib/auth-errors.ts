/** Auth errors carry a stable `code`; the library's own messages are blunt or technical. */
interface AuthLikeError {
  code?: string;
  name?: string;
  message?: string;
}

const GENERIC = "Something went wrong. Try again.";

/** What to tell the person when sign-in, sign-up or a password change fails. */
export function authErrorMessage(error: unknown): string {
  const { code, name, message } = (error ?? {}) as AuthLikeError;
  switch (code) {
    case "invalid_credentials":
      return "Wrong email or password.";
    case "email_not_confirmed":
      return "Confirm your email first: open the link we sent you.";
    case "user_already_exists":
    case "email_exists":
      return "That email already has an account. Try signing in.";
    case "weak_password":
      return message || "Choose a stronger password.";
    case "email_address_invalid":
    case "validation_failed":
      return "Enter a valid email address.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Too many tries. Wait a few minutes and try again.";
    case "same_password":
      return "Choose a password you haven't used before.";
  }
  if (name === "AuthRetryableFetchError") return "Couldn't reach the server. Check your connection and try again.";
  return message || GENERIC;
}

/**
 * What a provider (Google) sends back to the callback page when sign-in didn't complete,
 * as a message to show, or null when nothing went wrong. The error can arrive in the address's
 * query or its hash. The provider's own wording is technical (and stays visible in the address
 * for debugging), so only "cancelled" is told apart.
 */
export function providerReturnError(url: { search: string; hash: string }): string | null {
  const read = (raw: string) => new URLSearchParams(raw.replace(/^[?#]/, ""));
  const error = read(url.search).get("error") ?? read(url.hash).get("error");
  if (!error) return null;
  if (error === "access_denied") return "Sign-in was cancelled.";
  return "Couldn't sign you in with that account. Try again, or use your email instead.";
}
