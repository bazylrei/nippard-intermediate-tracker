import { describe, it, expect, vi } from "vitest";
import { platformFrom, youtubeVideoId, appLink, openInYouTubeApp, APP_OPEN_WAIT_MS, type OpenEnv } from "@/lib/youtube";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15";
const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126";
const MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15";

describe("youtubeVideoId", () => {
  it.each([
    ["https://www.youtube.com/watch?v=abc123DEF_-", "abc123DEF_-"],
    ["https://youtube.com/watch?v=abc&t=10", "abc"],
    ["https://m.youtube.com/watch?v=abc", "abc"],
    ["https://youtu.be/abc?si=xyz", "abc"],
    ["https://www.youtube.com/shorts/abc", "abc"],
    ["https://www.youtube.com/embed/abc", "abc"],
  ])("finds the id in %s", (url, id) => expect(youtubeVideoId(url)).toBe(id));

  it.each(["https://vimeo.com/123", "https://www.youtube.com/@channel", "https://www.youtube.com/watch", "not a url"])(
    "returns null for %s", (url) => expect(youtubeVideoId(url)).toBeNull(),
  );
});

describe("platformFrom", () => {
  it("tells phones from everything else", () => {
    expect(platformFrom(IPHONE)).toBe("ios");
    expect(platformFrom(ANDROID)).toBe("android");
    expect(platformFrom(MAC)).toBe("other");
  });
});

describe("appLink", () => {
  it("uses the YouTube app scheme on iOS", () => {
    expect(appLink("https://youtu.be/abc?si=x", "ios")).toBe("youtube://www.youtube.com/watch?v=abc");
  });

  it("uses an intent with a browser fallback on Android", () => {
    const link = appLink("https://youtu.be/abc", "android")!;
    expect(link).toContain("package=com.google.android.youtube");
    expect(link).toContain(`S.browser_fallback_url=${encodeURIComponent("https://www.youtube.com/watch?v=abc")}`);
  });

  it("has nothing to try on desktop or for other sites", () => {
    expect(appLink("https://youtu.be/abc", "other")).toBeNull();
    expect(appLink("https://vimeo.com/1", "ios")).toBeNull();
  });
});

function env(userAgent: string, visible = true) {
  const e = { userAgent, navigate: vi.fn(), openTab: vi.fn(), isVisible: () => visible, later: vi.fn() } satisfies OpenEnv;
  return e;
}

describe("openInYouTubeApp", () => {
  const url = "https://youtu.be/abc";

  it("declines on desktop, leaving the ordinary link to open", () => {
    const e = env(MAC);
    expect(openInYouTubeApp(url, e)).toBe(false);
    expect(e.navigate).not.toHaveBeenCalled();
  });

  it("hands Android the intent, which falls back by itself", () => {
    const e = env(ANDROID);
    expect(openInYouTubeApp(url, e)).toBe(true);
    expect(e.navigate).toHaveBeenCalledWith(expect.stringContaining("intent://"));
    expect(e.later).not.toHaveBeenCalled();
  });

  it("on iOS tries the app, then opens the browser if the page is still showing (no app)", () => {
    const e = env(IPHONE, true);
    expect(openInYouTubeApp(url, e)).toBe(true);
    expect(e.navigate).toHaveBeenCalledWith("youtube://www.youtube.com/watch?v=abc");
    const [fallback, wait] = e.later.mock.calls[0];
    expect(wait).toBe(APP_OPEN_WAIT_MS);
    fallback();
    expect(e.openTab).toHaveBeenCalledWith(url);
  });

  it("on iOS does nothing more once the app has taken over (page hidden)", () => {
    const e = env(IPHONE, false);
    openInYouTubeApp(url, e);
    e.later.mock.calls[0][0]();
    expect(e.openTab).not.toHaveBeenCalled();
  });
});
