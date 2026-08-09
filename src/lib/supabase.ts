import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

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
