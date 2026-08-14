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
  ensureSupabase,
  isSupabaseConfigured,
  supabase,
  type SawraAyahBookmarkRow,
  type SawraListenDayRow,
  type SawraPlaybackRow,
  type SawraProfileRow,
  type SawraSurahProgressRow,
  type SawraUserSettingsRow,
} from '../lib/supabase';
import type { AyahBookmark, ListenDay, SurahProgress } from '../utils/libraryTypes';
import { NOTE_MAX_LENGTH } from '../utils/libraryTypes';
import { clearLocalLibraryData } from '../utils/libraryStorage';
import { identifyPostHogUser, resetPostHogUser } from '../utils/posthog';

type AuthMode = 'signin' | 'signup';

interface AuthContextValue {
  configured: boolean;
  loading: boolean;
  sessionReady: boolean;
  session: Session | null;
  user: User | null;
  profile: SawraProfileRow | null;
  authError: string | null;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  signUp: (
    email: string,
    password: string,
    displayName?: string
  ) => Promise<{ ok: boolean; message?: string }>;
  signOut: () => Promise<void>;
  deleteOwnAccount: () => Promise<{ ok: boolean; message?: string }>;
  clearAuthError: () => void;
  updateDisplayName: (displayName: string) => Promise<{ ok: boolean; message?: string }>;
  fetchFavoriteReciterIds: () => Promise<number[]>;
  setFavoriteReciter: (reciterId: number, liked: boolean) => Promise<void>;
  syncFavoritesMerge: (localIds: number[]) => Promise<number[]>;
  fetchPlaybackState: () => Promise<SawraPlaybackRow | null>;
  upsertPlaybackState: (payload: {
    reciterId: number;
    moshafId: number;
    surahId: number;
    positionSeconds: number;
    isPlaying: boolean;
    deviceId: string;
    deviceLabel: string;
    ayah?: number | null;
  }) => Promise<void>;
  fetchUserSettings: () => Promise<SawraUserSettingsRow | null>;
  upsertUserSettings: (payload: {
    volume: number;
    playbackSpeed: number;
    repeatMode: 'none' | 'one' | 'all';
    playerTheme: string;
    playerV2Prefs: object;
    selectedSurahIds: number[];
  }) => Promise<void>;
  fetchAyahBookmarks: () => Promise<AyahBookmark[]>;
  upsertAyahBookmark: (bookmark: AyahBookmark) => Promise<AyahBookmark | null>;
  deleteAyahBookmark: (surahId: number, ayah: number) => Promise<void>;
  fetchSurahProgress: () => Promise<SurahProgress[]>;
  upsertSurahProgress: (row: SurahProgress) => Promise<void>;
  fetchListenDays: () => Promise<{ ok: boolean; days: ListenDay[] }>;
  applyListenDayDelta: (payload: {
    day: string;
    addSeconds: number;
    addSessions: number;
    tzOffsetMinutes: number | null;
  }) => Promise<ListenDay | null>;
}

const hasStoredSupabaseSession = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith('sb-') || !key.includes('auth-token')) continue;
      const raw = localStorage.getItem(key);
      if (raw && raw.includes('access_token')) return true;
    }
  } catch {
    return false;
  }
  return false;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [session, setSession] = useState<Session | null>(null);
  const [sessionReady, setSessionReady] = useState(
    () => !isSupabaseConfigured || !hasStoredSupabaseSession(),
  );
  const [profile, setProfile] = useState<SawraProfileRow | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  const identifiedUserIdRef = useRef<string | null>(null);

  const user = session?.user ?? null;

  const loadProfile = useCallback(async (userId: string) => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('sawra_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      console.warn('sawra profile load failed', error.message);
      return;
    }
    if (!data) {
      const { data: inserted } = await supabase
        .from('sawra_profiles')
        .upsert({
          id: userId,
          display_name: userId.slice(0, 8),
        })
        .select('*')
        .maybeSingle();
      setProfile((inserted as SawraProfileRow | null) ?? null);
      return;
    }
    setProfile(data as SawraProfileRow);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let mounted = true;
    let unsubscribe: (() => void) | undefined;
    let booted = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    // Don't block the shell on auth — restore session after first interaction.
    setLoading(false);

    const teardown = () => {
      window.removeEventListener('pointerdown', onInteract);
      window.removeEventListener('keydown', onInteract);
      window.removeEventListener('touchstart', onInteract);
    };

    const markSessionReady = () => {
      if (mounted) setSessionReady(true);
    };

    const boot = () => {
      if (booted || !mounted) return;
      booted = true;
      teardown();
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);

      void ensureSupabase().then((client) => {
        if (!mounted) return;
        if (!client) {
          markSessionReady();
          return;
        }

        client.auth.getSession().then(({ data }) => {
          if (!mounted) return;
          setSession(data.session);
          userIdRef.current = data.session?.user.id ?? null;
          if (data.session?.user.id) {
            void loadProfile(data.session.user.id);
          }
          markSessionReady();
        }).catch(() => {
          markSessionReady();
        });

        const { data: sub } = client.auth.onAuthStateChange((_event, nextSession) => {
          const nextUserId = nextSession?.user.id ?? null;
          if (identifiedUserIdRef.current && identifiedUserIdRef.current !== nextUserId) {
            resetPostHogUser();
            identifiedUserIdRef.current = null;
          }

          setSession(nextSession);
          userIdRef.current = nextUserId;
          if (nextUserId) {
            void loadProfile(nextUserId);
          } else {
            setProfile(null);
          }
        });
        unsubscribe = () => sub.subscription.unsubscribe();
      });
    };

    const onInteract = () => boot();

    window.addEventListener('pointerdown', onInteract, { once: true, passive: true });
    window.addEventListener('keydown', onInteract, { once: true });
    window.addEventListener('touchstart', onInteract, { once: true, passive: true });
    // Returning users: restore now so history/streak are not wiped as “guest”.
    // Guests / Lighthouse: keep the late fallback so the SDK stays off the first paint.
    if (hasStoredSupabaseSession()) {
      boot();
    } else {
      timeoutId = window.setTimeout(boot, 45000);
    }

    return () => {
      mounted = false;
      unsubscribe?.();
      teardown();
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
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
    const client = await ensureSupabase();
    if (!client) return { ok: false, message: 'Supabase non configuré.' };
    setAuthError(null);
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      const message = translateAuthError(error.message);
      setAuthError(message);
      return { ok: false, message };
    }
    return { ok: true };
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName?: string) => {
    const client = await ensureSupabase();
    if (!client) return { ok: false, message: 'Supabase non configuré.' };
    setAuthError(null);
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName?.trim() || undefined },
      },
    });

    // Compte déjà présent (ex. GoMuslimLife.com) → tenter une connexion directe
    if (error && /already registered|user already/i.test(error.message)) {
      const login = await client.auth.signInWithPassword({ email, password });
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
    const client = await ensureSupabase();
    if (!client) return;
    await client.auth.signOut();
    setProfile(null);
    resetPostHogUser();
    identifiedUserIdRef.current = null;
  }, []);

  const deleteOwnAccount = useCallback(async () => {
    if (!supabase || !userIdRef.current) {
      return { ok: false, message: 'Non connecté.' };
    }
    const { error } = await supabase.rpc('sawra_delete_own_account');
    if (error) {
      console.warn('account delete failed', error.message);
      return { ok: false, message: 'Impossible de supprimer le compte. Réessayez.' };
    }
    clearLocalLibraryData();
    const client = await ensureSupabase();
    if (client) {
      await client.auth.signOut();
    }
    setProfile(null);
    resetPostHogUser();
    identifiedUserIdRef.current = null;
    return { ok: true };
  }, []);

  useEffect(() => {
    if (!sessionReady || !user?.id || identifiedUserIdRef.current === user.id) return;
    if (identifiedUserIdRef.current) resetPostHogUser();

    const displayName = user.user_metadata.display_name;
    identifyPostHogUser(user.id, {
      email: user.email,
      name: typeof displayName === 'string' ? displayName : undefined,
    });
    identifiedUserIdRef.current = user.id;
  }, [sessionReady, user]);

  const updateDisplayName = useCallback(async (displayName: string) => {
    if (!supabase || !userIdRef.current) {
      return { ok: false, message: 'Non connecté.' };
    }
    const next = displayName.trim().slice(0, 40);
    if (!next) {
      return { ok: false, message: 'Le pseudo ne peut pas être vide.' };
    }
    const { data, error } = await supabase
      .from('sawra_profiles')
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
    if (data) setProfile(data as SawraProfileRow);
    else setProfile((prev) => (prev ? { ...prev, display_name: next } : prev));
    return { ok: true };
  }, []);

  const fetchFavoriteReciterIds = useCallback(async () => {
    if (!supabase || !userIdRef.current) return [];
    const { data, error } = await supabase
      .from('sawra_favorite_reciters')
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
      const { error } = await supabase.from('sawra_favorite_reciters').upsert({
        user_id: userIdRef.current,
        reciter_id: reciterId,
      });
      if (error) console.warn('favorite upsert failed', error.message);
      return;
    }
    const { error } = await supabase
      .from('sawra_favorite_reciters')
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
      const { error } = await supabase.from('sawra_favorite_reciters').upsert(
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
      .from('sawra_playback_state')
      .select('*')
      .eq('user_id', userIdRef.current)
      .maybeSingle();
    if (error) {
      console.warn('playback fetch failed', error.message);
      return null;
    }
    return (data as SawraPlaybackRow | null) ?? null;
  }, []);

  const upsertPlaybackState = useCallback(async (payload: {
    reciterId: number;
    moshafId: number;
    surahId: number;
    positionSeconds: number;
    isPlaying: boolean;
    deviceId: string;
    deviceLabel: string;
    ayah?: number | null;
  }) => {
    if (!supabase || !userIdRef.current) return;
    const row: Record<string, unknown> = {
      user_id: userIdRef.current,
      reciter_id: payload.reciterId,
      moshaf_id: payload.moshafId,
      surah_id: payload.surahId,
      position_seconds: Math.max(0, payload.positionSeconds),
      is_playing: payload.isPlaying,
      device_id: payload.deviceId,
      device_label: payload.deviceLabel,
      updated_at: new Date().toISOString(),
    };
    if (payload.ayah !== undefined) {
      row.ayah = payload.ayah;
    }
    const { error } = await supabase.from('sawra_playback_state').upsert(row);
    if (error) console.warn('playback upsert failed', error.message);
  }, []);

  const mapBookmarkRow = (row: SawraAyahBookmarkRow): AyahBookmark => ({
    id: row.id,
    surahId: row.surah_id,
    ayah: row.ayah,
    reciterId: row.reciter_id,
    moshafId: row.moshaf_id,
    note: row.note ?? '',
    snippetAr: row.snippet_ar ?? '',
    snippetFr: row.snippet_fr ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });

  const fetchAyahBookmarks = useCallback(async () => {
    if (!supabase || !userIdRef.current) return [];
    const { data, error } = await supabase
      .from('sawra_ayah_bookmarks')
      .select('*')
      .eq('user_id', userIdRef.current)
      .order('updated_at', { ascending: false });
    if (error) {
      console.warn('bookmarks fetch failed', error.message);
      return [];
    }
    return ((data as SawraAyahBookmarkRow[]) ?? []).map(mapBookmarkRow);
  }, []);

  const upsertAyahBookmark = useCallback(async (bookmark: AyahBookmark) => {
    if (!supabase || !userIdRef.current) return null;
    const { data, error } = await supabase
      .from('sawra_ayah_bookmarks')
      .upsert(
        {
          user_id: userIdRef.current,
          surah_id: bookmark.surahId,
          ayah: bookmark.ayah,
          reciter_id: bookmark.reciterId,
          moshaf_id: bookmark.moshafId,
          note: bookmark.note.slice(0, NOTE_MAX_LENGTH),
          snippet_ar: bookmark.snippetAr.slice(0, 180),
          snippet_fr: bookmark.snippetFr.slice(0, 180),
          created_at: bookmark.createdAt,
          updated_at: bookmark.updatedAt,
        },
        { onConflict: 'user_id,surah_id,ayah' },
      )
      .select('*')
      .maybeSingle();
    if (error) {
      console.warn('bookmark upsert failed', error.message);
      return null;
    }
    return data ? mapBookmarkRow(data as SawraAyahBookmarkRow) : bookmark;
  }, []);

  const deleteAyahBookmark = useCallback(async (surahId: number, ayah: number) => {
    if (!supabase || !userIdRef.current) return;
    const { error } = await supabase
      .from('sawra_ayah_bookmarks')
      .delete()
      .eq('user_id', userIdRef.current)
      .eq('surah_id', surahId)
      .eq('ayah', ayah);
    if (error) console.warn('bookmark delete failed', error.message);
  }, []);

  const fetchSurahProgress = useCallback(async () => {
    if (!supabase || !userIdRef.current) return [];
    const { data, error } = await supabase
      .from('sawra_surah_progress')
      .select('*')
      .eq('user_id', userIdRef.current)
      .order('updated_at', { ascending: false });
    if (error) {
      console.warn('surah progress fetch failed', error.message);
      return [];
    }
    return ((data as SawraSurahProgressRow[]) ?? []).map((row) => ({
      reciterId: row.reciter_id,
      moshafId: row.moshaf_id,
      surahId: row.surah_id,
      positionSeconds: row.position_seconds,
      ayah: row.ayah,
      updatedAt: row.updated_at,
    }));
  }, []);

  const upsertSurahProgress = useCallback(async (row: SurahProgress) => {
    if (!supabase || !userIdRef.current) return;
    const { error } = await supabase.from('sawra_surah_progress').upsert({
      user_id: userIdRef.current,
      reciter_id: row.reciterId,
      moshaf_id: row.moshafId,
      surah_id: row.surahId,
      position_seconds: Math.max(0, row.positionSeconds),
      ayah: row.ayah,
      updated_at: row.updatedAt,
    });
    if (error) console.warn('surah progress upsert failed', error.message);
  }, []);

  const fetchListenDays = useCallback(async (): Promise<{ ok: boolean; days: ListenDay[] }> => {
    if (!supabase || !userIdRef.current) return { ok: false, days: [] };
    const { data, error } = await supabase
      .from('sawra_listen_days')
      .select('*')
      .eq('user_id', userIdRef.current)
      .order('day', { ascending: false });
    if (error) {
      console.warn('listen days fetch failed', error.message);
      return { ok: false, days: [] };
    }
    return {
      ok: true,
      days: ((data as SawraListenDayRow[]) ?? []).map((row) => ({
        day: row.day,
        seconds: row.seconds,
        sessions: row.sessions,
        tzOffsetMinutes: row.tz_offset_minutes,
        updatedAt: row.updated_at,
      })),
    };
  }, []);

  const applyListenDayDelta = useCallback(async (payload: {
    day: string;
    addSeconds: number;
    addSessions: number;
    tzOffsetMinutes: number | null;
  }) => {
    if (!supabase || !userIdRef.current) return null;
    if (payload.addSeconds <= 0 && payload.addSessions <= 0) return null;

    const { data, error } = await supabase.rpc('sawra_add_listen_time', {
      p_day: payload.day,
      p_seconds: Math.max(0, Math.round(payload.addSeconds)),
      p_sessions: Math.max(0, Math.round(payload.addSessions)),
      p_tz_offset_minutes: payload.tzOffsetMinutes,
    });
    if (error) {
      console.warn('listen day increment failed', error.message);
      return null;
    }
    const row = data as SawraListenDayRow | null;
    if (!row) return null;
    return {
      day: row.day,
      seconds: row.seconds,
      sessions: row.sessions,
      tzOffsetMinutes: row.tz_offset_minutes,
      updatedAt: row.updated_at,
    };
  }, []);

  const fetchUserSettings = useCallback(async () => {
    if (!supabase || !userIdRef.current) return null;
    const { data, error } = await supabase
      .from('sawra_user_settings')
      .select('*')
      .eq('user_id', userIdRef.current)
      .maybeSingle();
    if (error) {
      console.warn('user settings fetch failed', error.message);
      return null;
    }
    return (data as SawraUserSettingsRow | null) ?? null;
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
    const { error } = await supabase.from('sawra_user_settings').upsert({
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
      sessionReady,
      session,
      user,
      profile,
      authError,
      signIn,
      signUp,
      signOut,
      deleteOwnAccount,
      clearAuthError: () => setAuthError(null),
      updateDisplayName,
      fetchFavoriteReciterIds,
      setFavoriteReciter,
      syncFavoritesMerge,
      fetchPlaybackState,
      upsertPlaybackState,
      fetchUserSettings,
      upsertUserSettings,
      fetchAyahBookmarks,
      upsertAyahBookmark,
      deleteAyahBookmark,
      fetchSurahProgress,
      upsertSurahProgress,
      fetchListenDays,
      applyListenDayDelta,
    }),
    [
      loading,
      sessionReady,
      session,
      user,
      profile,
      authError,
      signIn,
      signUp,
      signOut,
      deleteOwnAccount,
      updateDisplayName,
      fetchFavoriteReciterIds,
      setFavoriteReciter,
      syncFavoritesMerge,
      fetchPlaybackState,
      upsertPlaybackState,
      fetchUserSettings,
      upsertUserSettings,
      fetchAyahBookmarks,
      upsertAyahBookmark,
      deleteAyahBookmark,
      fetchSurahProgress,
      upsertSurahProgress,
      fetchListenDays,
      applyListenDayDelta,
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
