/**
 * Calendar day in the device timezone at `now`.
 * Never use `toISOString().slice(0, 10)` — that is UTC and breaks streaks near midnight.
 */
export function localDayKey(now: number = Date.now()): string {
  const d = new Date(now);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function tzOffsetMinutes(now: number = Date.now()): number {
  return -new Date(now).getTimezoneOffset();
}

/** Shift a YYYY-MM-DD key by `delta` local calendar days (naive, no TZ rewrite). */
export function shiftDayKey(day: string, delta: number): string {
  const [y, m, d] = day.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setDate(dt.getDate() + delta);
  return localDayKey(dt.getTime());
}
