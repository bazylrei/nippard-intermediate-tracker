import { describe, it, expect, vi, beforeEach } from "vitest";

const auth = vi.hoisted(() => ({ getSignedInUser: vi.fn() }));
vi.mock("@/lib/auth", () => auth);

import { requireSignedInUser, SIGN_IN_PATH } from "@/lib/require-user";

const router = { replace: vi.fn() };
beforeEach(() => vi.clearAllMocks());

describe("requireSignedInUser", () => {
  it("returns the user and leaves the page alone when signed in", async () => {
    auth.getSignedInUser.mockResolvedValue({ id: "u1" });
    expect(await requireSignedInUser(router)).toEqual({ id: "u1" });
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("sends a signed-out visitor to sign in and returns null", async () => {
    auth.getSignedInUser.mockResolvedValue(null);
    expect(await requireSignedInUser(router)).toBeNull();
    expect(router.replace).toHaveBeenCalledWith(SIGN_IN_PATH);
    expect(SIGN_IN_PATH).toBe("/auth");
  });
});
