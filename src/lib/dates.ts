const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** "Nov 5" from a calendar date "YYYY-MM-DD" — parsed as-is, so no timezone shift. */
export function formatCalendarDate(ymd: string): string {
  const [, m, d] = ymd.split("-");
  return `${MONTHS[parseInt(m, 10) - 1]} ${parseInt(d, 10)}`;
}

/** "Today" / "Yesterday" / "N days ago" (< 7 days) / "Nov 3", by local calendar day. */
export function formatRelativeDay(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

/** "Thursday, Nov 12" in the viewer's locale. */
export function formatLongDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

/** A duration as a clock: "4:07", or "1:02:09" from an hour up. Negative counts as zero. */
export function formatElapsed(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = String(s % 60).padStart(2, "0");
  return hours > 0 ? `${hours}:${String(mins).padStart(2, "0")}:${secs}` : `${mins}:${secs}`;
}

/** A date's local calendar day as "YYYY-MM-DD" (not UTC, which can be a day off). */
export function localYmd(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The local "YYYY-MM-DD" of the most recent `weekStartsOn` day (0 = Sunday) on or before `date`. */
export function startOfWeek(date: Date, weekStartsOn: number): string {
  const back = (date.getDay() - weekStartsOn + 7) % 7;
  return localYmd(new Date(date.getFullYear(), date.getMonth(), date.getDate() - back));
}
