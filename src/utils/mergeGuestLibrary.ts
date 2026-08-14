import type { AyahBookmark, ListenDay, SurahProgress } from './libraryTypes';
import { bookmarkKey, progressKey } from './libraryTypes';

/**
 * Idempotent guest → account merge.
 *
 * Cases (bookmarks):
 * - local only → keep local
 * - remote only → keep remote
 * - same surah+ayah both sides → one row: newest note (tie: longer), cloud voice if set, oldest createdAt
 * - replay with same inputs → same output (pure)
 */

const ts = (iso: string) => {
  const n = Date.parse(iso);
  return Number.isFinite(n) ? n : 0;
};

export function mergeBookmarks(
  local: AyahBookmark[],
  remote: AyahBookmark[],
): AyahBookmark[] {
  const map = new Map<string, AyahBookmark>();
  for (const row of remote) {
    map.set(bookmarkKey(row.surahId, row.ayah), row);
  }
  for (const row of local) {
    const key = bookmarkKey(row.surahId, row.ayah);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, row);
      continue;
    }
    map.set(key, mergeOneBookmark(existing, row));
  }
  return [...map.values()].sort((a, b) => ts(b.updatedAt) - ts(a.updatedAt));
}

function mergeOneBookmark(remote: AyahBookmark, local: AyahBookmark): AyahBookmark {
  const remoteTs = ts(remote.updatedAt);
  const localTs = ts(local.updatedAt);
  let note = remote.note;
  let snippetAr = remote.snippetAr;
  let snippetFr = remote.snippetFr;
  let updatedAt = remote.updatedAt;
  if (localTs > remoteTs) {
    note = local.note;
    snippetAr = local.snippetAr || remote.snippetAr;
    snippetFr = local.snippetFr || remote.snippetFr;
    updatedAt = local.updatedAt;
  } else if (localTs === remoteTs) {
    const localNote = local.note.trim();
    const remoteNote = remote.note.trim();
    if (localNote.length > remoteNote.length) {
      note = local.note;
    }
  }

  return {
    id: remote.id || local.id,
    surahId: remote.surahId,
    ayah: remote.ayah,
    reciterId: remote.reciterId ?? local.reciterId,
    moshafId: remote.moshafId ?? local.moshafId,
    note,
    snippetAr,
    snippetFr,
    createdAt: ts(local.createdAt) < ts(remote.createdAt) ? local.createdAt : remote.createdAt,
    updatedAt,
  };
}

export function mergeProgress(
  local: SurahProgress[],
  remote: SurahProgress[],
): SurahProgress[] {
  const map = new Map<string, SurahProgress>();
  for (const row of remote) {
    map.set(progressKey(row.reciterId, row.moshafId, row.surahId), row);
  }
  for (const row of local) {
    const key = progressKey(row.reciterId, row.moshafId, row.surahId);
    const existing = map.get(key);
    if (!existing || ts(row.updatedAt) > ts(existing.updatedAt)) {
      map.set(key, row);
    }
  }
  return [...map.values()].sort((a, b) => ts(b.updatedAt) - ts(a.updatedAt));
}

export type ListenDayDelta = {
  day: string;
  addSeconds: number;
  addSessions: number;
  tzOffsetMinutes: number | null;
};

/**
 * Seconds/sessions not yet credited to the cloud for this device.
 * `alreadyPushed[day]` = local totals that were already added — replay is a no-op.
 */
export function listenDayDeltas(
  local: ListenDay[],
  alreadyPushed: Record<string, { seconds: number; sessions: number }>,
): ListenDayDelta[] {
  const deltas: ListenDayDelta[] = [];
  for (const row of local) {
    const pushed = alreadyPushed[row.day] ?? { seconds: 0, sessions: 0 };
    const addSeconds = Math.max(0, row.seconds - pushed.seconds);
    const addSessions = Math.max(0, row.sessions - pushed.sessions);
    if (addSeconds === 0 && addSessions === 0) continue;
    deltas.push({
      day: row.day,
      addSeconds,
      addSessions,
      tzOffsetMinutes: row.tzOffsetMinutes,
    });
  }
  return deltas;
}

export function applyListenDeltasToRemote(
  remote: ListenDay[],
  deltas: ListenDayDelta[],
  nowIso: string,
): ListenDay[] {
  const map = new Map(remote.map((row) => [row.day, { ...row }]));
  for (const delta of deltas) {
    const existing = map.get(delta.day);
    if (!existing) {
      map.set(delta.day, {
        day: delta.day,
        seconds: delta.addSeconds,
        sessions: delta.addSessions,
        tzOffsetMinutes: delta.tzOffsetMinutes,
        updatedAt: nowIso,
      });
      continue;
    }
    existing.seconds += delta.addSeconds;
    existing.sessions += delta.addSessions;
    if (existing.tzOffsetMinutes == null) {
      existing.tzOffsetMinutes = delta.tzOffsetMinutes;
    }
    existing.updatedAt = nowIso;
  }
  return [...map.values()].sort((a, b) => b.day.localeCompare(a.day));
}
