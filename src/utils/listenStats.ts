import { STREAK_MIN_SECONDS, type ListenDay } from './libraryTypes';
import { localDayKey, shiftDayKey } from './localDay';

export function computeStreak(days: ListenDay[], now: number = Date.now()): number {
  const qualified = new Set(
    days.filter((row) => row.seconds >= STREAK_MIN_SECONDS).map((row) => row.day),
  );
  const today = localDayKey(now);
  const start = qualified.has(today) ? today : shiftDayKey(today, -1);
  if (!qualified.has(start)) return 0;

  let streak = 0;
  let cursor = start;
  while (qualified.has(cursor)) {
    streak += 1;
    cursor = shiftDayKey(cursor, -1);
  }
  return streak;
}

export function sumListenSeconds(days: ListenDay[]): number {
  return days.reduce((sum, row) => sum + Math.max(0, row.seconds), 0);
}

export function secondsToday(days: ListenDay[], now: number = Date.now()): number {
  const key = localDayKey(now);
  return days.find((row) => row.day === key)?.seconds ?? 0;
}

export function secondsThisWeek(days: ListenDay[], now: number = Date.now()): number {
  const today = localDayKey(now);
  const allowed = new Set(Array.from({ length: 7 }, (_, i) => shiftDayKey(today, -i)));
  return days
    .filter((row) => allowed.has(row.day))
    .reduce((sum, row) => sum + Math.max(0, row.seconds), 0);
}

export function lastSevenDays(days: ListenDay[], now: number = Date.now()): Array<{
  day: string;
  seconds: number;
  qualified: boolean;
}> {
  const today = localDayKey(now);
  const byDay = new Map(days.map((row) => [row.day, row.seconds]));
  return Array.from({ length: 7 }, (_, i) => {
    const day = shiftDayKey(today, i - 6);
    const seconds = byDay.get(day) ?? 0;
    return { day, seconds, qualified: seconds >= STREAK_MIN_SECONDS };
  });
}

export function formatListenDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h} h ${m} min`;
  if (m > 0) return `${m} min`;
  return `${s} s`;
}

export function relativeTimeLabel(iso: string, now: number = Date.now()): string {
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return '';
  const delta = Math.max(0, now - then);
  const mins = Math.floor(delta / 60000);
  if (mins < 1) return 'À l’instant';
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Hier';
  return `Il y a ${days} j`;
}
