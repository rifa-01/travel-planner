/** Date helpers that work on plain YYYY-MM-DD strings in UTC, so server and client agree. */

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Whole days from `a` to `b` (positive when b is later). */
export function daysBetween(a: string, b: string) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { ...opts, timeZone: "UTC" });
}

export function formatRange(start: string, days: number) {
  const end = addDays(start, days - 1);
  if (days === 1) return formatDate(start, { day: "numeric", month: "short", year: "numeric" });
  return `${formatDate(start, { day: "numeric", month: "short" })} – ${formatDate(end, { day: "numeric", month: "short", year: "numeric" })}`;
}
