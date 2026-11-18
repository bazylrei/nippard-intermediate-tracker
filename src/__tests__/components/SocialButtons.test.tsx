import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

const auth = vi.hoisted(() => ({ getEnabledSocialProviders: vi.fn() }));
vi.mock("@/lib/auth", () => auth);

import SocialButtons from "@/components/auth/SocialButtons";

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  auth.getEnabledSocialProviders.mockResolvedValue(["google"]);
});

async function renderButtons(onChoose = vi.fn().mockResolvedValue(undefined)) {
  await act(async () => { render(<SocialButtons onChoose={onChoose} />); });
  return onChoose;
}
const google = () => screen.getByRole("button", { name: /Continue with Google/ });

describe("SocialButtons", () => {
  it("offers Google, then an 'or' before the email form, once it's switched on", async () => {
    await renderButtons();
    expect(google()).toBeInTheDocument();
    expect(screen.getByRole("separator", { name: "or" })).toBeInTheDocument();
  });

  it("offers Apple beside Google, each starting its own sign-in", async () => {
    auth.getEnabledSocialProviders.mockResolvedValue(["google", "apple"]);
    const onChoose = await renderButtons();
    const buttons = screen.getAllByRole("button");
    expect(buttons.map((b) => b.textContent)).toEqual(["Continue with Google", "Continue with Apple"]);

    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /Continue with Apple/ })); });
    expect(onChoose).toHaveBeenCalledWith("apple");
  });

  it("offers only Apple when Google is off", async () => {
    auth.getEnabledSocialProviders.mockResolvedValue(["apple"]);
    await renderButtons();
    expect(screen.queryByRole("button", { name: /Google/ })).toBeNull();
    expect(screen.getByRole("button", { name: /Continue with Apple/ })).toBeInTheDocument();
  });

  it("shows nothing at all while no provider is switched on, so no button can lead to an error page", async () => {
    auth.getEnabledSocialProviders.mockResolvedValue([]);
    await renderButtons();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("separator")).toBeNull();
  });

  it("starts signing in with the chosen provider, and can't be pressed twice", async () => {
    let resolve: () => void = () => {};
    const onChoose = vi.fn().mockReturnValue(new Promise<void>((r) => { resolve = r; }));
    await renderButtons(onChoose);

    await act(async () => { fireEvent.click(google()); });
    expect(onChoose).toHaveBeenCalledWith("google");
    expect(screen.getByRole("button", { name: "Opening…" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Opening…" }));
    await act(async () => { resolve(); });
    expect(onChoose).toHaveBeenCalledTimes(1);
  });

  it("says why, and lets them try again, when sign-in can't start", async () => {
    const onChoose = vi.fn().mockRejectedValue(Object.assign(new Error("x"), { code: "over_request_rate_limit" }));
    await renderButtons(onChoose);
    await act(async () => { fireEvent.click(google()); });

    expect(screen.getByRole("alert")).toHaveTextContent("Too many tries");
    expect(google()).toBeEnabled();
  });
});
