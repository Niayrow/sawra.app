import { shuffleIds } from './radioQueue';

/**
 * Custom shareable radio — short human-readable codes (no account required).
 * Example: `123+54/78-114/x` → sawra.app/radio?r=123+54/78-114/x
 */

export type CustomRadioConfig = {
  name: string;
  reciterIds: number[];
  surahIds: number[];
  shuffle: boolean;
};

export type RadioSlot = {
  reciterId: number;
  surahId: number;
};

export const CUSTOM_RADIO_ID = 'custom';
export const CUSTOM_RADIO_MAX_RECITERS = 6;
export const CUSTOM_RADIO_MAX_SURAHS = 40;
export const CUSTOM_RADIO_GRADIENT: [string, string, string] = ['#1a2540', '#3a5080', '#bfa078'];
export const CUSTOM_RADIO_DEFAULT_NAME = 'Ma radio Sawra';

/** Popular surah packs for one-tap playlist building. */
export const SURAH_PACKS: Array<{ id: string; label: string; surahIds: number[] }> = [
  {
    id: 'juz-amma',
    label: 'Juz Amma',
    surahIds: Array.from({ length: 37 }, (_, i) => i + 78),
  },
  {
    id: 'coeur',
    label: 'Sourates du cœur',
    surahIds: [18, 32, 36, 55, 56, 67, 78, 112, 113, 114],
  },
  {
    id: 'courtes',
    label: 'Courtes',
    surahIds: [1, 93, 94, 95, 97, 99, 103, 109, 112, 113, 114],
  },
  {
    id: 'classiques',
    label: 'Classiques',
    surahIds: [1, 2, 18, 36, 55, 67, 78, 112, 113, 114],
  },
];

const clampUnique = (ids: number[], max: number) =>
  [...new Set(ids.filter((id) => Number.isFinite(id) && id > 0))].slice(0, max);

export function normalizeCustomRadio(raw: Partial<CustomRadioConfig> | null | undefined): CustomRadioConfig | null {
  if (!raw) return null;
  const reciterIds = clampUnique(raw.reciterIds ?? [], CUSTOM_RADIO_MAX_RECITERS);
  const surahIds = clampUnique(raw.surahIds ?? [], CUSTOM_RADIO_MAX_SURAHS).sort((a, b) => a - b);
  if (!reciterIds.length || !surahIds.length) return null;
  const name = (raw.name ?? '').trim().slice(0, 48) || CUSTOM_RADIO_DEFAULT_NAME;
  return {
    name,
    reciterIds,
    surahIds,
    shuffle: Boolean(raw.shuffle),
  };
}

/** Build playback slots: each surah paired with the next rotating voice. */
export function buildCustomRadioSlots(
  config: CustomRadioConfig,
  canPlay?: (reciterId: number, surahId: number) => boolean,
): RadioSlot[] {
  const surahs = config.shuffle
    ? shuffleIds(config.surahIds)
    : [...config.surahIds].sort((a, b) => a - b);
  const voices = [...config.reciterIds];
  if (!voices.length) return [];

  // Start from a random voice when shuffle is on so each launch feels different.
  let voiceCursor = config.shuffle ? Math.floor(Math.random() * voices.length) : 0;
  const slots: RadioSlot[] = [];

  for (const surahId of surahs) {
    let assigned = false;
    for (let attempt = 0; attempt < voices.length; attempt++) {
      const reciterId = voices[(voiceCursor + attempt) % voices.length];
      if (canPlay && !canPlay(reciterId, surahId)) continue;
      slots.push({ surahId, reciterId });
      voiceCursor = (voiceCursor + attempt + 1) % voices.length;
      assigned = true;
      break;
    }
    if (!assigned) continue;
  }

  return slots;
}

/** Compress sorted ids into `1,3,78-114` style ranges. */
function encodeSurahSpec(ids: number[]): string {
  if (!ids.length) return '';
  const sorted = [...ids].sort((a, b) => a - b);
  const parts: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];

  for (let i = 1; i <= sorted.length; i++) {
    const cur = sorted[i];
    if (cur === prev + 1) {
      prev = cur;
      continue;
    }
    parts.push(start === prev ? String(start) : `${start}-${prev}`);
    start = cur;
    prev = cur;
  }

  return parts.join(',');
}

function decodeSurahSpec(spec: string): number[] {
  const out: number[] = [];
  for (const part of spec.split(',')) {
    const token = part.trim();
    if (!token) continue;
    const range = token.match(/^(\d{1,3})-(\d{1,3})$/);
    if (range) {
      const a = Number(range[1]);
      const b = Number(range[2]);
      if (!Number.isFinite(a) || !Number.isFinite(b) || a < 1 || b > 114 || a > b) continue;
      for (let id = a; id <= b; id++) out.push(id);
      continue;
    }
    const id = Number(token);
    if (Number.isFinite(id) && id >= 1 && id <= 114) out.push(id);
  }
  return out;
}

function fromBase64UrlText(token: string): string | null {
  try {
    const padded = token.replace(/-/g, '+').replace(/_/g, '/');
    const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
    const binary = atob(padded + pad);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

/**
 * Short readable code: `123.54/78-114/x`
 * Optional custom name: `123.54/1,18,36/x/~Soirée`
 */
export function encodeCustomRadio(config: CustomRadioConfig): string {
  const normalized = normalizeCustomRadio(config);
  if (!normalized) return '';

  const voices = normalized.reciterIds.join('.');
  const surahs = encodeSurahSpec(normalized.surahIds);
  const flag = normalized.shuffle ? 'x' : 'o';
  let code = `${voices}/${surahs}/${flag}`;

  if (normalized.name !== CUSTOM_RADIO_DEFAULT_NAME) {
    const safeName = encodeURIComponent(normalized.name).replace(/%20/g, '+');
    code += `/~${safeName}`;
  }

  return code;
}

function decodeShortCode(token: string): CustomRadioConfig | null {
  // `+` in query strings is often decoded as space — normalize both.
  const raw = token.trim().replace(/ /g, '+');
  if (!raw || !/^\d/.test(raw)) return null;

  const nameIdx = raw.indexOf('/~');
  const body = nameIdx >= 0 ? raw.slice(0, nameIdx) : raw;
  const namePart = nameIdx >= 0 ? raw.slice(nameIdx + 2) : '';

  const parts = body.split('/');
  if (parts.length < 2) return null;

  const reciterIds = parts[0]
    .split(/[.+]/)
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n) && n > 0);

  const surahIds = decodeSurahSpec(parts[1] ?? '');
  const flag = (parts[2] ?? 'x').toLowerCase();
  const shuffle = flag !== 'o' && flag !== '0';

  let name = CUSTOM_RADIO_DEFAULT_NAME;
  if (namePart) {
    try {
      name = decodeURIComponent(namePart.replace(/\+/g, ' ')).trim().slice(0, 48) || name;
    } catch {
      name = namePart.replace(/\+/g, ' ').trim().slice(0, 48) || name;
    }
  }

  return normalizeCustomRadio({ name, reciterIds, surahIds, shuffle });
}

/** Legacy JSON-in-base64 links (`?c=`). */
function decodeLegacyJsonToken(token: string): CustomRadioConfig | null {
  const json = fromBase64UrlText(token);
  if (!json || json[0] !== '{') return null;
  try {
    const parsed = JSON.parse(json) as { n?: string; r?: number[]; s?: number[]; x?: number };
    return normalizeCustomRadio({
      name: parsed.n,
      reciterIds: parsed.r,
      surahIds: parsed.s,
      shuffle: parsed.x === 1,
    });
  } catch {
    return null;
  }
}

export function decodeCustomRadio(token: string): CustomRadioConfig | null {
  if (!token) return null;
  const trimmed = token.trim();
  const short = decodeShortCode(trimmed);
  if (short) return short;
  return decodeLegacyJsonToken(trimmed);
}

export function customRadioShareUrl(config: CustomRadioConfig, origin = 'https://sawra.app'): string {
  const token = encodeCustomRadio(config);
  if (!token) return `${origin}/radio`;
  return `${origin}/radio?r=${token}`;
}

/** Short label for UI (without https://). */
export function customRadioShareLabel(config: CustomRadioConfig, origin = 'https://sawra.app'): string {
  return customRadioShareUrl(config, origin).replace(/^https?:\/\//, '');
}

export function readCustomRadioFromSearch(search: string): CustomRadioConfig | null {
  try {
    const params = new URLSearchParams(search.startsWith('?') ? search : `?${search}`);
    const token = params.get('r') || params.get('c') || params.get('custom');
    return token ? decodeCustomRadio(token) : null;
  } catch {
    return null;
  }
}
