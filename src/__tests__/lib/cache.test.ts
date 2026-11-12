import { describe, it, expect, beforeEach } from "vitest";
import { cacheGet, cacheSet, cacheDelete } from "@/lib/cache";

const PREFIX = "workout_cache_";

describe("cacheGet", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns null for a missing key", () => {
    expect(cacheGet("nonexistent")).toBeNull();
  });

  it("returns null for corrupted JSON", () => {
    localStorage.setItem(PREFIX + "bad", "not-json");
    expect(cacheGet("bad")).toBeNull();
  });
});

describe("cacheSet / cacheGet round-trip", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("stores and retrieves a simple string", () => {
    cacheSet("my_key", "hello");
    expect(cacheGet("my_key")).toBe("hello");
  });

  it("stores and retrieves a complex object", () => {
    const obj = { week: 3, dayIndex: 1, nested: { x: [1, 2, 3] } };
    cacheSet("complex", obj);
    expect(cacheGet("complex")).toEqual(obj);
  });

  it("stores items under the workout_cache_ prefix", () => {
    cacheSet("test_key", 42);
    expect(localStorage.getItem(PREFIX + "test_key")).toBe("42");
  });

  it("stores null value and retrieves it", () => {
    cacheSet("null_val", null);
    // JSON.parse("null") is null, but the conditional `raw ? ... : null` means stored null returns null
    expect(cacheGet("null_val")).toBeNull();
  });
});

describe("cacheDelete", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("removes the item so subsequent cacheGet returns null", () => {
    cacheSet("delete_me", { foo: "bar" });
    expect(cacheGet("delete_me")).not.toBeNull();
    cacheDelete("delete_me");
    expect(cacheGet("delete_me")).toBeNull();
  });

  it("does not throw when deleting a non-existent key", () => {
    expect(() => cacheDelete("does_not_exist")).not.toThrow();
  });

  it("only removes the targeted key, leaving others intact", () => {
    cacheSet("keep", "keep_me");
    cacheSet("remove", "remove_me");
    cacheDelete("remove");
    expect(cacheGet("keep")).toBe("keep_me");
    expect(cacheGet("remove")).toBeNull();
  });
});
