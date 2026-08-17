import { ensureSupabase } from '../lib/supabase';
import { capturePostHogEvent } from './posthog';

export const SUGGESTION_KINDS = ['improvement', 'feature'] as const;
export type SuggestionKind = (typeof SUGGESTION_KINDS)[number];

export const SUGGESTION_MIN_LENGTH = 8;
export const SUGGESTION_MAX_LENGTH = 800;
const COOLDOWN_MS = 2 * 60 * 1000;
const COOLDOWN_KEY = 'sawra_suggestion_last_at';

export function isSuggestionKind(value: string): value is SuggestionKind {
  return (SUGGESTION_KINDS as readonly string[]).includes(value);
}

function readCooldown(): number {
  try {
    const raw = localStorage.getItem(COOLDOWN_KEY);
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function writeCooldown() {
  try {
    localStorage.setItem(COOLDOWN_KEY, String(Date.now()));
  } catch {
    // ignore
  }
}

export async function submitSuggestion(input: {
  kind: SuggestionKind;
  message: string;
  userId: string | null;
  honeypot?: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  if (input.honeypot?.trim()) {
    return { ok: true };
  }

  const message = input.message.trim().replace(/\s+/g, ' ');
  if (message.length < SUGGESTION_MIN_LENGTH) {
    return { ok: false, message: `Écrivez au moins ${SUGGESTION_MIN_LENGTH} caractères.` };
  }
  if (message.length > SUGGESTION_MAX_LENGTH) {
    return { ok: false, message: `Maximum ${SUGGESTION_MAX_LENGTH} caractères.` };
  }
  if (!isSuggestionKind(input.kind)) {
    return { ok: false, message: 'Choisissez un type de suggestion.' };
  }

  const lastAt = readCooldown();
  if (Date.now() - lastAt < COOLDOWN_MS) {
    const wait = Math.ceil((COOLDOWN_MS - (Date.now() - lastAt)) / 1000);
    return {
      ok: false,
      message: `Patientez encore ${wait} s avant d’envoyer une autre suggestion.`,
    };
  }

  const client = await ensureSupabase();
  if (!client) {
    return { ok: false, message: 'Envoi indisponible pour le moment.' };
  }

  const { error } = await client.from('sawra_suggestions').insert({
    user_id: input.userId,
    kind: input.kind,
    message,
  });

  if (error) {
    return { ok: false, message: 'Impossible d’envoyer la suggestion. Réessayez.' };
  }

  writeCooldown();
  capturePostHogEvent('suggestion_submitted', {
    kind: input.kind,
    message_length: message.length,
  });
  return { ok: true };
}
