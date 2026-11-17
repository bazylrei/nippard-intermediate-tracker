import { describe, it, expect, vi, beforeEach } from "vitest";

const db = vi.hoisted(() => ({ isOnboarded: vi.fn(), completeOnboarding: vi.fn() }));
vi.mock("@/lib/db", () => db);

import { checkOnboarded, finishOnboarding, ONBOARDING_PATH } from "@/lib/onboarding";

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  db.isOnboarded.mockResolvedValue(false);
  db.completeOnboarding.mockResolvedValue(undefined);
});

describe("checkOnboarded", () => {
  it("asks the account, and remembers a yes on this device", async () => {
    db.isOnboarded.mockResolvedValue(true);
    expect(await checkOnboarded("user-1")).toBe(true);
    expect(await checkOnboarded("user-1")).toBe(true);
    expect(db.isOnboarded).toHaveBeenCalledTimes(1);
  });

  it("asks again every time while the answer is no", async () => {
    expect(await checkOnboarded("user-1")).toBe(false);
    expect(await checkOnboarded("user-1")).toBe(false);
    expect(db.isOnboarded).toHaveBeenCalledTimes(2);
  });

  it("doesn't carry one account's yes over to another on the same device", async () => {
    db.isOnboarded.mockResolvedValueOnce(true);
    await checkOnboarded("user-1");
    expect(await checkOnboarded("user-2")).toBe(false);
    expect(db.isOnboarded).toHaveBeenLastCalledWith("user-2");
  });

  it("lets a failed check throw for the caller to handle", async () => {
    db.isOnboarded.mockRejectedValue(new Error("offline"));
    await expect(checkOnboarded("user-1")).rejects.toThrow("offline");
  });
});

describe("finishOnboarding", () => {
  it("records it on the account and then on this device", async () => {
    await finishOnboarding("user-1");
    expect(db.completeOnboarding).toHaveBeenCalledWith("user-1");
    expect(await checkOnboarded("user-1")).toBe(true);
    expect(db.isOnboarded).not.toHaveBeenCalled();
  });

  it("remembers nothing on this device when saving fails", async () => {
    db.completeOnboarding.mockRejectedValue(new Error("offline"));
    await expect(finishOnboarding("user-1")).rejects.toThrow("offline");
    expect(await checkOnboarded("user-1")).toBe(false);
  });
});

describe("ONBOARDING_PATH", () => {
  it("is the onboarding screen", () => expect(ONBOARDING_PATH).toBe("/onboarding"));
});
