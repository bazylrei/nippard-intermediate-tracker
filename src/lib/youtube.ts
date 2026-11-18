/** Opening a YouTube link in the YouTube app when the phone has it, else in the browser. */

export type Platform = "ios" | "android" | "other";

export function platformFrom(userAgent: string): Platform {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return "ios";
  if (/Android/i.test(userAgent)) return "android";
  return "other";
}

/** The video id of a youtu.be / youtube.com watch, shorts or embed link; null for anything else. */
export function youtubeVideoId(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^(www|m)\./, "");
  if (host === "youtu.be") return u.pathname.split("/")[1] || null;
  if (host !== "youtube.com") return null;
  if (u.pathname === "/watch") return u.searchParams.get("v");
  const [, kind, id] = u.pathname.split("/");
  return (kind === "shorts" || kind === "embed") && id ? id : null;
}

/**
 * A link that opens the YouTube app: the app's own scheme on iOS, and on Android an intent that
 * falls back to the browser by itself when the app is missing. Null when there's no app link to
 * try (desktop, or not a YouTube video).
 */
export function appLink(url: string, platform: Platform): string | null {
  const id = youtubeVideoId(url);
  if (!id) return null;
  if (platform === "ios") return `youtube://www.youtube.com/watch?v=${id}`;
  if (platform === "android") {
    const web = `https://www.youtube.com/watch?v=${id}`;
    return `intent://www.youtube.com/watch?v=${id}#Intent;scheme=https;package=com.google.android.youtube;S.browser_fallback_url=${encodeURIComponent(web)};end`;
  }
  return null;
}

/** What opening a video touches, so it can be swapped out in tests. */
export interface OpenEnv {
  userAgent: string;
  navigate: (href: string) => void;
  openTab: (href: string) => void;
  isVisible: () => boolean;
  later: (fn: () => void, ms: number) => void;
}

const browserEnv = (): OpenEnv => ({
  userAgent: navigator.userAgent,
  navigate: (href) => { window.location.href = href; },
  openTab: (href) => { window.open(href, "_blank", "noopener,noreferrer"); },
  isVisible: () => document.visibilityState === "visible",
  later: (fn, ms) => { window.setTimeout(fn, ms); },
});

/** How long to wait for the app to take over before falling back to the browser (iOS can't tell us). */
export const APP_OPEN_WAIT_MS = 1200;

/**
 * Tries the YouTube app. Returns false when there is no app link to try, so the caller lets the
 * ordinary link open. iOS can't say whether the app is installed, so if the page is still showing
 * shortly after, the video opens in the browser instead.
 */
export function openInYouTubeApp(url: string, env: OpenEnv = browserEnv()): boolean {
  const platform = platformFrom(env.userAgent);
  const link = appLink(url, platform);
  if (!link) return false;
  env.navigate(link);
  if (platform === "ios") {
    env.later(() => { if (env.isVisible()) env.openTab(url); }, APP_OPEN_WAIT_MS);
  }
  return true;
}
