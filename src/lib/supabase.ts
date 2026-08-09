import type { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/** Populated by ensureSupabase() — null until the SDK chunk is loaded. */
export let supabase: SupabaseClient | null = null;

let bootPromise: Promise<SupabaseClient | null> | null = null;

/** Lazy-load @supabase/supabase-js so it stays off the critical boot path. */
export const ensureSupabase = (): Promise<SupabaseClient | null> => {
  if (!isSupabaseConfigured) return Promise.resolve(null);
  if (supabase) return Promise.resolve(supabase);
  if (!bootPromise) {
    bootPromise = import('@supabase/supabase-js').then(({ createClient }) => {
      supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
      return supabase;
    });
  }
  return bootPromise;
};

export type SawraPlaybackRow = {
  user_id: string;
  reciter_id: number;
  moshaf_id: number;
  surah_id: number;
  position_seconds: number;
  updated_at: string;
  is_playing: boolean;
  device_id: string | null;
  device_label: string | null;
};

export type SawraFavoriteRow = {
  user_id: string;
  reciter_id: number;
  created_at: string;
};

export type SawraProfileRow = {
  id: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
};

export type SawraUserSettingsRow = {
  user_id: string;
  volume: number;
  playback_speed: number;
  repeat_mode: 'none' | 'one' | 'all';
  player_theme: string;
  player_v2_prefs: Record<string, unknown>;
  selected_surah_ids: number[];
  updated_at: string;
};
