import { describe, it, expect } from "vitest";
import nextConfig from "../../../next.config";

describe("next config redirects", () => {
  it("sends the program builder's old addresses to the new screens", async () => {
    const redirects = await nextConfig.redirects!();
    expect(redirects).toContainEqual({ source: "/builder", destination: "/programs", permanent: true });
    expect(redirects).toContainEqual({ source: "/builder/:programId", destination: "/programs/:programId", permanent: true });
  });
});
