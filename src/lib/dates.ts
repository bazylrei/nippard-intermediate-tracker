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
