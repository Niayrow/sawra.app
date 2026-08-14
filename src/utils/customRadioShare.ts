import { SEEDED_RECITERS } from '../data/recitersSeed';
import type { CustomRadioConfig } from './customRadio';
import { decodeCustomRadio, encodeCustomRadio } from './customRadio';
import { OG_IMAGE, SITE_ORIGIN } from './seoMetadata';

const RECITER_NAME_BY_ID = new Map(SEEDED_RECITERS.map((r) => [r.id, r.name]));

export function customRadioVoiceNames(config: CustomRadioConfig, limit = 3): string[] {
  return config.reciterIds
    .map((id) => RECITER_NAME_BY_ID.get(id))
    .filter((name): name is string => Boolean(name))
    .slice(0, limit);
}

export function buildCustomRadioSocialMeta(config: CustomRadioConfig): {
  title: string;
  description: string;
  shareText: string;
} {
  const voices = customRadioVoiceNames(config, 3);
  const more = config.reciterIds.length > voices.length ? '…' : '';
  const voiceLine = voices.length
    ? `${voices.join(', ')}${more}`
    : `${config.reciterIds.length} récitateur${config.reciterIds.length > 1 ? 's' : ''}`;

  const title = `${config.name} — Radio Coran | Sawra`;
  const description = `Écoute « ${config.name} » sur Sawra : ${config.reciterIds.length} voix (${voiceLine}) · ${config.surahIds.length} sourates enchaînées. Gratuit, sans publicité.`;
  const shareText = `${config.name} — ${config.reciterIds.length} voix · ${config.surahIds.length} sourates sur Sawra. Écoute le Coran gratuitement.`;

  return { title, description, shareText };
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(token: string): string | null {
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

/** Path-safe token for OG image URLs (no `/` — Twitter/X often fails on `%2F`). */
export function encodeCustomRadioOgToken(config: CustomRadioConfig): string {
  return toBase64Url(encodeCustomRadio(config));
}

export function decodeCustomRadioOgToken(token: string): CustomRadioConfig | null {
  const raw = fromBase64Url(token.trim());
  return raw ? decodeCustomRadio(raw) : null;
}

/**
 * Absolute OG image URL — path-based, no query string.
 * Example: https://sawra.app/og/r/ODYuMjAuMzEv...
 */
export function customRadioOgImageUrl(config: CustomRadioConfig, origin = SITE_ORIGIN): string {
  return `${origin}/og/r/${encodeCustomRadioOgToken(config)}`;
}

export const CUSTOM_RADIO_OG_FALLBACK = OG_IMAGE;
