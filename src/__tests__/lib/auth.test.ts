import { describe, it, expect, vi } from "vitest";

const getSession = vi.hoisted(() => vi.fn());
const getUser = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase", () => ({
  createClient: () => ({ auth: { getSession, getUser } }),
}));

import { getSignedInUser } from "@/lib/auth";

describe("getSignedInUser", () => {
  it("returns the user from the local session without calling the Auth server", async () => {
    getSession.mockResolvedValue({ data: { session: { user: { id: "user-1" } } } });
    expect(await getSignedInUser()).toEqual({ id: "user-1" });
    expect(getUser).not.toHaveBeenCalled();
  });

  it("returns null when there is no session", async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    expect(await getSignedInUser()).toBeNull();
  });
});
