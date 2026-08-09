import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import {
  isSupabaseConfigured,
  supabase,
  type QuranifyPlaybackRow,
  type QuranifyProfileRow,
  type QuranifyUserSettingsRow,
} from '../lib/supabase';

type AuthMode = 'signin' | 'signup';

interface AuthContextValue {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: QuranifyProfileRow | null;
  authError: string | null;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  signUp: (
    email: string,
    password: string,
    displayName?: string
  ) => Promise<{ ok: boolean; message?: string }>;
  signOut: () => Promise<void>;
  clearAuthError: () => void;
  updateDisplayName: (displayName: string) => Promise<{ ok: boolean; message?: string }>;
  fetchFavoriteReciterIds: () => Promise<number[]>;
  setFavoriteReciter: (reciterId: number, liked: boolean) => Promise<void>;
  syncFavoritesMerge: (localIds: number[]) => Promise<number[]>;
  fetchPlaybackState: () => Promise<QuranifyPlaybackRow | null>;
  upsertPlaybackState: (payload: {
    reciterId: number;
    moshafId: number;
    surahId: number;
    positionSeconds: number;
    isPlaying: boolean;
    deviceId: string;
    deviceLabel: string;
  }) => Promise<void>;
  fetchUserSettings: () => Promise<QuranifyUserSettingsRow | null>;
  upsertUserSettings: (payload: {
    volume: number;
    playbackSpeed: number;
    repeatMode: 'none' | 'one' | 'all';
    playerTheme: string;
    playerV2Prefs: object;
    selectedSurahIds: number[];
  }) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<QuranifyProfileRow | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const userIdRef = useRef<string | null>(null);

  const user = session?.user ?? null;

  const loadProfile = useCallback(async (userId: string) => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('quranify_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      console.warn('quranify profile load failed', error.message);
      return;
    }
    if (!data) {
      const { data: inserted } = await supabase
        .from('quranify_profiles')
        .upsert({
          id: userId,
          display_name: userId.slice(0, 8),
        })
        .select('*')
        .maybeSingle();
      setProfile((inserted as QuranifyProfileRow | null) ?? null);
      return;
    }
    setProfile(data as QuranifyProfileRow);
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      userIdRef.current = data.session?.user.id ?? null;
      if (data.session?.user.id) {
        void loadProfile(data.session.user.id);
      }
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      userIdRef.current = nextSession?.user.id ?? null;
      if (nextSession?.user.id) {
        void loadProfile(nextSession.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const translateAuthError = (message: string) => {
    const lower = message.toLowerCase();
    if (lower.includes('already registered') || lower.includes('user already')) {
      return 'Ce compte existe déjà. Connectez-vous avec votre e-mail et mot de passe.';
    }
    if (lower.includes('invalid login') || lower.includes('invalid credentials')) {
      return 'E-mail ou mot de passe incorrect.';
    }
    if (lower.includes('email not confirmed')) {
      return 'E-mail non confirmé. Vérifiez votre boîte mail, ou désactivez la confirmation dans Supabase Auth.';
    }
    return message;
  };

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return { ok: false, message: 'Supabase non configuré.' };
    setAuthError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const message = translateAuthError(error.message);
      setAuthError(message);
      return { ok: false, message };
    }
    return { ok: true };
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName?: string) => {
    if (!supabase) return { ok: false, message: 'Supabase non configuré.' };
    setAuthError(null);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName?.trim() || undefined },
      },
    });

    // Compte déjà présent (ex. GoMuslimLife.com) → tenter une connexion directe
    if (error && /already registered|user already/i.test(error.message)) {
      const login = await supabase.auth.signInWithPassword({ email, password });
      if (!login.error) {
        return { ok: true, message: 'Compte existant détecté — connexion réussie.' };
      }
      const message = translateAuthError(error.message);
      setAuthError(message);
      return { ok: false, message, code: 'already_registered' as const };
    }

    if (error) {
      const message = translateAuthError(error.message);
      setAuthError(message);
      return { ok: false, message };
    }
    if (data.user && !data.session) {
      return {
        ok: true,
        message: 'Compte créé. Vérifiez votre e-mail pour confirmer, puis connectez-vous.',
      };
    }
    return { ok: true };
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const updateDisplayName = useCallback(async (displayName: string) => {
    if (!supabase || !userIdRef.current) {
      return { ok: false, message: 'Non connecté.' };
    }
    const next = displayName.trim().slice(0, 40);
    if (!next) {
      return { ok: false, message: 'Le pseudo ne peut pas être vide.' };
    }
    const { data, error } = await supabase
      .from('quranify_profiles')
      .upsert({
        id: userIdRef.current,
        display_name: next,
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .maybeSingle();
    if (error) {
      console.warn('profile rename failed', error.message);
      return { ok: false, message: 'Impossible d’enregistrer le pseudo.' };
    }
    if (data) setProfile(data as QuranifyProfileRow);
    else setProfile((prev) => (prev ? { ...prev, display_name: next } : prev));
    return { ok: true };
  }, []);

  const fetchFavoriteReciterIds = useCallback(async () => {
    if (!supabase || !userIdRef.current) return [];
    const { data, error } = await supabase
      .from('quranify_favorite_reciters')
      .select('reciter_id')
      .eq('user_id', userIdRef.current);
    if (error) {
      console.warn('favorites fetch failed', error.message);
      return [];
    }
    return (data ?? []).map((row) => Number(row.reciter_id)).filter((id) => Number.isFinite(id));
  }, []);

  const setFavoriteReciter = useCallback(async (reciterId: number, liked: boolean) => {
    if (!supabase || !userIdRef.current) return;
    if (liked) {
      const { error } = await supabase.from('quranify_favorite_reciters').upsert({
        user_id: userIdRef.current,
        reciter_id: reciterId,
      });
      if (error) console.warn('favorite upsert failed', error.message);
      return;
    }
    const { error } = await supabase
      .from('quranify_favorite_reciters')
      .delete()
      .eq('user_id', userIdRef.current)
      .eq('reciter_id', reciterId);
    if (error) console.warn('favorite delete failed', error.message);
  }, []);

  const syncFavoritesMerge = useCallback(async (localIds: number[]) => {
    if (!supabase || !userIdRef.current) return localIds;
    const remoteIds = await fetchFavoriteReciterIds();
    const merged = Array.from(new Set([...localIds, ...remoteIds]));
    const missingOnRemote = merged.filter((id) => !remoteIds.includes(id));
    if (missingOnRemote.length > 0) {
      const { error } = await supabase.from('quranify_favorite_reciters').upsert(
        missingOnRemote.map((reciter_id) => ({
          user_id: userIdRef.current!,
          reciter_id,
        }))
      );
      if (error) console.warn('favorites merge upsert failed', error.message);
    }
    return merged;
  }, [fetchFavoriteReciterIds]);

  const fetchPlaybackState = useCallback(async () => {
    if (!supabase || !userIdRef.current) return null;
    const { data, error } = await supabase
      .from('quranify_playback_state')
      .select('*')
      .eq('user_id', userIdRef.current)
      .maybeSingle();
    if (error) {
      console.warn('playback fetch failed', error.message);
      return null;
    }
    return (data as QuranifyPlaybackRow | null) ?? null;
  }, []);

  const upsertPlaybackState = useCallback(async (payload: {
    reciterId: number;
    moshafId: number;
    surahId: number;
    positionSeconds: number;
    isPlaying: boolean;
    deviceId: string;
    deviceLabel: string;
  }) => {
    if (!supabase || !userIdRef.current) return;
    const { error } = await supabase.from('quranify_playback_state').upsert({
      user_id: userIdRef.current,
      reciter_id: payload.reciterId,
      moshaf_id: payload.moshafId,
      surah_id: payload.surahId,
      position_seconds: Math.max(0, payload.positionSeconds),
      is_playing: payload.isPlaying,
      device_id: payload.deviceId,
      device_label: payload.deviceLabel,
      updated_at: new Date().toISOString(),
    });
    if (error) console.warn('playback upsert failed', error.message);
  }, []);

  const fetchUserSettings = useCallback(async () => {
    if (!supabase || !userIdRef.current) return null;
    const { data, error } = await supabase
      .from('quranify_user_settings')
      .select('*')
      .eq('user_id', userIdRef.current)
      .maybeSingle();
    if (error) {
      console.warn('user settings fetch failed', error.message);
      return null;
    }
    return (data as QuranifyUserSettingsRow | null) ?? null;
  }, []);

  const upsertUserSettings = useCallback(async (payload: {
    volume: number;
    playbackSpeed: number;
    repeatMode: 'none' | 'one' | 'all';
    playerTheme: string;
    playerV2Prefs: object;
    selectedSurahIds: number[];
  }) => {
    if (!supabase || !userIdRef.current) return;
    const { error } = await supabase.from('quranify_user_settings').upsert({
      user_id: userIdRef.current,
      volume: Math.max(0, Math.min(1, payload.volume)),
      playback_speed: Math.max(0.5, Math.min(2, payload.playbackSpeed)),
      repeat_mode: payload.repeatMode,
      player_theme: payload.playerTheme,
      player_v2_prefs: payload.playerV2Prefs,
      selected_surah_ids: payload.selectedSurahIds,
      updated_at: new Date().toISOString(),
    });
    if (error) console.warn('user settings upsert failed', error.message);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      configured: isSupabaseConfigured,
      loading,
      session,
      user,
      profile,
      authError,
      signIn,
      signUp,
      signOut,
      clearAuthError: () => setAuthError(null),
      updateDisplayName,
      fetchFavoriteReciterIds,
      setFavoriteReciter,
      syncFavoritesMerge,
      fetchPlaybackState,
      upsertPlaybackState,
      fetchUserSettings,
      upsertUserSettings,
    }),
    [
      loading,
      session,
      user,
      profile,
      authError,
      signIn,
      signUp,
      signOut,
      updateDisplayName,
      fetchFavoriteReciterIds,
      setFavoriteReciter,
      syncFavoritesMerge,
      fetchPlaybackState,
      upsertPlaybackState,
      fetchUserSettings,
      upsertUserSettings,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

export type { AuthMode };
