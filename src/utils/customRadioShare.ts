import { SEEDED_RECITERS } from '../data/recitersSeed';
import type { CustomRadioConfig } from './customRadio';
import { encodeCustomRadio } from './customRadio';
import { SITE_ORIGIN } from './seoMetadata';

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

/** Absolute OG image URL for a custom radio link. */
export function customRadioOgImageUrl(config: CustomRadioConfig, origin = SITE_ORIGIN): string {
  const token = encodeCustomRadio(config);
  return `${origin}/og/radio?r=${encodeURIComponent(token)}`;
}
