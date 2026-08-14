import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAudio } from '../context/AudioContext';
import {
  supabase,
  type SawraPlaybackRow,
  type SawraUserSettingsRow,
} from '../lib/supabase';
import { getLocalDeviceId, getLocalDeviceLabel } from '../lib/deviceId';
import { SURAHS } from '../data/surahs';
import { useActiveAyah } from '../hooks/useActiveAyah';
import { resolveStableAyah } from '../utils/stableAyah';

const FAVORITES_KEY = 'quran_streamer_favorites';
const POLL_MS = 800;
const SETTINGS_POLL_MS = 2500;
const PAUSE_PUSH_DELAY_MS = 500;
const TAKEOVER_GRACE_MS = 3500;
const HEARTBEAT_MS = 1000;
const SETTINGS_PUSH_DELAY_MS = 350;

const settingsSignature = (payload: {
  volume: number;
  playbackSpeed: number;
  repeatMode: string;
  playerTheme: string;
  playerV2Prefs: unknown;
  selectedSurahIds: number[];
}) =>
  JSON.stringify({
    volume: Math.round(payload.volume * 1000) / 1000,
    playbackSpeed: Math.round(payload.playbackSpeed * 100) / 100,
    repeatMode: payload.repeatMode,
    playerTheme: payload.playerTheme,
    playerV2Prefs: payload.playerV2Prefs,
    selectedSurahIds: [...payload.selectedSurahIds].sort((a, b) => a - b),
  });

const signatureFromSettingsRow = (row: SawraUserSettingsRow) =>
  settingsSignature({
    volume: row.volume,
    playbackSpeed: row.playback_speed,
    repeatMode: row.repeat_mode,
    playerTheme: row.player_theme,
    playerV2Prefs: row.player_v2_prefs,
    selectedSurahIds: row.selected_surah_ids ?? [],
  });

interface CloudSyncProps {
  favorites: number[];
  setFavorites: React.Dispatch<React.SetStateAction<number[]>>;
}

/**
 * Syncs Sawra favorites, settings/playlist loop, and multi-device playback.
 */
export const CloudSync: React.FC<CloudSyncProps> = ({ favorites, setFavorites }) => {
  const {
    user,
    syncFavoritesMerge,
    setFavoriteReciter,
    fetchPlaybackState,
    upsertPlaybackState,
    fetchUserSettings,
    upsertUserSettings,
  } = useAuth();
  const {
    currentTrack,
    currentTime,
    playbackStatus,
    isLoadingReciters,
    hydratePlaybackState,
    remoteSession,
    setRemoteSession,
    pause,
    playTrack,
    registerTakeOverHandler,
    setSuppressRemoteUntil,
    getAccurateCurrentTime,
    reciters,
    volume,
    playbackSpeed,
    repeatMode,
    playerTheme,
    playerV2Prefs,
    selectedSurahIds,
    hydrateCloudSettings,
    isSeekingNow,
  } = useAudio();
  const ayahSync = useActiveAyah({ enabled: Boolean(currentTrack) });

  const [settingsReady, setSettingsReady] = useState(false);
  const selectedSurahKey = [...selectedSurahIds].sort((a, b) => a - b).join(',');

  const lastPushedFavorites = useRef<string>('');
  const lastPushedSettings = useRef<string>('');
  const pendingSettingsSigRef = useRef<string | null>(null);
  const suppressRemoteSettingsUntilRef = useRef(0);
  const lastRemoteSettingsAtRef = useRef(0);
  const settingsPushTimer = useRef<number | null>(null);
  const didHydrateCloud = useRef(false);
  const favoritesRef = useRef(favorites);
  favoritesRef.current = favorites;

  const currentTrackRef = useRef(currentTrack);
  currentTrackRef.current = currentTrack;
  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;
  const playbackStatusRef = useRef(playbackStatus);
  playbackStatusRef.current = playbackStatus;
  const remoteSessionRef = useRef(remoteSession);
  remoteSessionRef.current = remoteSession;
  const recitersRef = useRef(reciters);
  recitersRef.current = reciters;

  const localDeviceId = useRef(getLocalDeviceId());
  const localDeviceLabel = useRef(getLocalDeviceLabel());
  const weOwnPlaybackRef = useRef(false);
  const lastPushKey = useRef('');
  const lastPushAtRef = useRef(0);
  const pausePushTimer = useRef<number | null>(null);
  const suppressRemoteUntilRef = useRef(0);
  const lastRemoteKeyRef = useRef('');
  const pausedForRemoteRef = useRef(false);

  const pauseRef = useRef(pause);
  pauseRef.current = pause;
  const hydrateRef = useRef(hydratePlaybackState);
  hydrateRef.current = hydratePlaybackState;
  const setRemoteSessionRef = useRef(setRemoteSession);
  setRemoteSessionRef.current = setRemoteSession;
  const fetchPlaybackRef = useRef(fetchPlaybackState);
  fetchPlaybackRef.current = fetchPlaybackState;
  const upsertRef = useRef(upsertPlaybackState);
  upsertRef.current = upsertPlaybackState;
  const playTrackRef = useRef(playTrack);
  playTrackRef.current = playTrack;
  const getAccurateTimeRef = useRef(getAccurateCurrentTime);
  getAccurateTimeRef.current = getAccurateCurrentTime;
  const setSuppressRef = useRef(setSuppressRemoteUntil);
  setSuppressRef.current = setSuppressRemoteUntil;
  const fetchSettingsRef = useRef(fetchUserSettings);
  fetchSettingsRef.current = fetchUserSettings;
  const upsertSettingsRef = useRef(upsertUserSettings);
  upsertSettingsRef.current = upsertUserSettings;
  const hydrateSettingsRef = useRef(hydrateCloudSettings);
  hydrateSettingsRef.current = hydrateCloudSettings;
  const volumeRef = useRef(volume);
  volumeRef.current = volume;
  const playbackSpeedRef = useRef(playbackSpeed);
  playbackSpeedRef.current = playbackSpeed;
  const repeatModeRef = useRef(repeatMode);
  repeatModeRef.current = repeatMode;
  const playerThemeRef = useRef(playerTheme);
  playerThemeRef.current = playerTheme;
  const playerV2PrefsRef = useRef(playerV2Prefs);
  playerV2PrefsRef.current = playerV2Prefs;
  const selectedSurahIdsRef = useRef(selectedSurahIds);
  selectedSurahIdsRef.current = selectedSurahIds;
  const lastStableAyahRef = useRef<number | null>(null);
  const ayahSyncRef = useRef(ayahSync);
  ayahSyncRef.current = ayahSync;
  const isSeekingRef = useRef(isSeekingNow);
  isSeekingRef.current = isSeekingNow;

  useEffect(() => {
    lastStableAyahRef.current = null;
  }, [currentTrack?.reciter.id, currentTrack?.surah.id, currentTrack?.moshaf.id]);

  const applyRemoteSettings = (row: SawraUserSettingsRow) => {
    if (!row || typeof row.user_id !== 'string') return;
    const signature = signatureFromSettingsRow(row);

    // Echo of our own in-flight write
    if (pendingSettingsSigRef.current && signature === pendingSettingsSigRef.current) {
      lastPushedSettings.current = signature;
      pendingSettingsSigRef.current = null;
      const echoedAt = Date.parse(row.updated_at);
      if (Number.isFinite(echoedAt)) lastRemoteSettingsAtRef.current = echoedAt;
      return;
    }

    if (signature === lastPushedSettings.current) return;

    // Local edit in progress — ignore stale cloud snapshots
    if (
      pendingSettingsSigRef.current ||
      Date.now() < suppressRemoteSettingsUntilRef.current
    ) {
      return;
    }

    const remoteAt = Date.parse(row.updated_at);
    if (Number.isFinite(remoteAt) && remoteAt <= lastRemoteSettingsAtRef.current) {
      return;
    }
    if (Number.isFinite(remoteAt)) lastRemoteSettingsAtRef.current = remoteAt;

    lastPushedSettings.current = signature;
    hydrateSettingsRef.current({
      volume: row.volume,
      playbackSpeed: row.playback_speed,
      repeatMode: row.repeat_mode,
      playerTheme: row.player_theme,
      playerV2Prefs: row.player_v2_prefs as Partial<typeof playerV2Prefs>,
      selectedSurahIds: row.selected_surah_ids ?? [],
    });
  };

  const queueLocalSettings = (signature: string) => {
    pendingSettingsSigRef.current = signature;
    suppressRemoteSettingsUntilRef.current = Date.now() + 4000;
  };

  const clearPauseTimer = () => {
    if (pausePushTimer.current !== null) {
      window.clearTimeout(pausePushTimer.current);
      pausePushTimer.current = null;
    }
  };

  const readPosition = () => {
    const accurate = getAccurateTimeRef.current();
    if (Number.isFinite(accurate) && accurate > 0) return accurate;
    return Math.max(0, currentTimeRef.current || 0);
  };

  const applyRemoteRow = (row: SawraPlaybackRow) => {
    if (!row.device_id) return;

    if (Date.now() < suppressRemoteUntilRef.current) {
      // During takeover grace, ignore other devices
      if (row.device_id !== localDeviceId.current) return;
    }

    // Echo from this device
    if (row.device_id === localDeviceId.current) {
      weOwnPlaybackRef.current = Boolean(row.is_playing);
      if (row.is_playing) {
        pausedForRemoteRef.current = false;
        setRemoteSessionRef.current(null);
      }
      return;
    }

    // Another device owns playback and is actively playing
    if (row.is_playing) {
      const wasOwning = weOwnPlaybackRef.current;
      weOwnPlaybackRef.current = false;

      const remoteKey = `${row.device_id}:${row.reciter_id}:${row.surah_id}`;
      const isNewRemoteTrack = remoteKey !== lastRemoteKeyRef.current;
      const positionChanged =
        !remoteSessionRef.current ||
        Math.abs((remoteSessionRef.current.positionSeconds || 0) - (row.position_seconds || 0)) > 0.75 ||
        remoteSessionRef.current.updatedAt !== row.updated_at;

      // Stop local audio ASAP whenever another device claims playback
      if (
        wasOwning ||
        playbackStatusRef.current === 'playing' ||
        playbackStatusRef.current === 'buffering' ||
        !pausedForRemoteRef.current
      ) {
        pausedForRemoteRef.current = true;
        pauseRef.current();
      }

      if (isNewRemoteTrack) {
        lastRemoteKeyRef.current = remoteKey;
        hydrateRef.current({
          reciterId: row.reciter_id,
          moshafId: row.moshaf_id,
          surahId: row.surah_id,
          positionSeconds: row.position_seconds,
        });
      }

      if (isNewRemoteTrack || positionChanged) {
        setRemoteSessionRef.current({
          reciterId: row.reciter_id,
          moshafId: row.moshaf_id,
          surahId: row.surah_id,
          positionSeconds: Math.max(0, row.position_seconds || 0),
          ayah: row.ayah ?? null,
          deviceId: row.device_id,
          deviceLabel: row.device_label,
          updatedAt: row.updated_at,
        });
      }
      return;
    }

    // Other device paused
    lastRemoteKeyRef.current = '';
    pausedForRemoteRef.current = false;
    setRemoteSessionRef.current(null);
  };

  const pushPlayback = (
    isPlaying: boolean,
    options?: { positionOverride?: number; allowSteal?: boolean }
  ) => {
    const track = currentTrackRef.current;
    if (!user || !track) return;

    const allowSteal = Boolean(options?.allowSteal);
    const remoteOwns =
      remoteSessionRef.current &&
      remoteSessionRef.current.deviceId !== localDeviceId.current;

    // Heartbeat must not steal; explicit local Play / new track may steal
    if (isPlaying && remoteOwns && !allowSteal) {
      return;
    }

    if (!isPlaying && !weOwnPlaybackRef.current) return;
    if (!isPlaying && remoteSessionRef.current) return;

    // User started playback here → take ownership from the other device
    if (isPlaying && allowSteal) {
      const graceUntil = Date.now() + TAKEOVER_GRACE_MS;
      suppressRemoteUntilRef.current = graceUntil;
      setSuppressRef.current(graceUntil);
      lastRemoteKeyRef.current = '';
      pausedForRemoteRef.current = false;
      setRemoteSessionRef.current(null);
    }

    let position =
      typeof options?.positionOverride === 'number'
        ? options.positionOverride
        : readPosition();

    // Avoid clobbering a known mid-track position with 0 right after load
    const remotePos = remoteSessionRef.current?.positionSeconds ?? 0;
    if (
      isPlaying &&
      !allowSteal &&
      position < 1 &&
      remotePos > 2 &&
      remoteSessionRef.current?.surahId === track.surah.id &&
      remoteSessionRef.current?.reciterId === track.reciter.id
    ) {
      position = remotePos;
    }

    const key = `${isPlaying ? 1 : 0}:${track.reciter.id}:${track.surah.id}:${Math.floor(position)}`;
    const now = Date.now();
    // Allow ownership flips immediately; throttle same-key spam
    if (key === lastPushKey.current && now - lastPushAtRef.current < 800) return;
    lastPushKey.current = key;
    lastPushAtRef.current = now;

    if (isPlaying) {
      weOwnPlaybackRef.current = true;
      pausedForRemoteRef.current = false;
      setRemoteSessionRef.current(null);
    } else {
      weOwnPlaybackRef.current = false;
    }

    const sync = ayahSyncRef.current;
    const seeking = isSeekingRef.current();
    const stable = resolveStableAyah({
      timings: sync.timings,
      available: sync.available,
      currentTime: position,
      playbackStatus: playbackStatusRef.current,
      isSeeking: seeking,
      trackSurahId: track.surah.id,
      timingsSurahId: track.surah.id,
    });
    if (stable != null) lastStableAyahRef.current = stable;
    const ayah = (seeking || playbackStatusRef.current === 'buffering')
      ? lastStableAyahRef.current
      : stable;

    void upsertRef.current({
      reciterId: track.reciter.id,
      moshafId: track.moshaf.id,
      surahId: track.surah.id,
      positionSeconds: position,
      isPlaying,
      deviceId: localDeviceId.current,
      deviceLabel: localDeviceLabel.current,
      ayah,
    });
  };

  // Register takeover handler: fetch fresh position, claim cloud, then play from there
  useEffect(() => {
    registerTakeOverHandler(async () => {
      const session = remoteSessionRef.current;
      const fresh = await fetchPlaybackRef.current();

      const reciterId = fresh?.reciter_id ?? session?.reciterId;
      const moshafId = fresh?.moshaf_id ?? session?.moshafId;
      const surahId = fresh?.surah_id ?? session?.surahId;
      if (!reciterId || !moshafId || !surahId) return false;

      const startAt = Math.max(
        0,
        fresh?.position_seconds ?? 0,
        session?.positionSeconds ?? 0
      );
      const resumeAyah = fresh?.ayah ?? session?.ayah ?? null;

      const catalog = recitersRef.current.find((r) => r.id === reciterId);
      if (!catalog) return false;
      const moshaf = catalog.moshaf.find((m) => m.id === moshafId) || catalog.moshaf[0];
      if (!moshaf) return false;
      const surah = SURAHS.find((s) => s.id === surahId);
      if (!surah) return false;

      const graceUntil = Date.now() + TAKEOVER_GRACE_MS;
      suppressRemoteUntilRef.current = graceUntil;
      setSuppressRef.current(graceUntil);
      weOwnPlaybackRef.current = true;
      pausedForRemoteRef.current = false;
      lastRemoteKeyRef.current = '';
      setRemoteSessionRef.current(null);

      // Claim ownership in cloud BEFORE audio starts (keeps position)
      await upsertRef.current({
        reciterId,
        moshafId: moshaf.id,
        surahId,
        positionSeconds: startAt,
        isPlaying: true,
        deviceId: localDeviceId.current,
        deviceLabel: localDeviceLabel.current,
        ayah: resumeAyah,
      });
      lastPushKey.current = `1:${reciterId}:${surahId}:${Math.floor(startAt)}`;
      lastPushAtRef.current = Date.now();

      await playTrackRef.current(catalog, moshaf, surah, startAt);
      return true;
    });

    return () => registerTakeOverHandler(null);
  }, [registerTakeOverHandler]);

  // On login: merge favorites + restore cloud playback metadata + settings
  useEffect(() => {
    if (!user || isLoadingReciters) return;
    let cancelled = false;

    const run = async () => {
      const merged = await syncFavoritesMerge(favoritesRef.current);
      if (cancelled) return;
      setFavorites(merged);
      try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(merged));
      } catch {
        // ignore
      }
      lastPushedFavorites.current = JSON.stringify([...merged].sort((a, b) => a - b));

      // Player prefs + selected surah playlist
      const cloudSettings = await fetchSettingsRef.current();
      if (cancelled) return;

      if (cloudSettings) {
        applyRemoteSettings(cloudSettings);
      } else {
        const localPayload = {
          volume: volumeRef.current,
          playbackSpeed: playbackSpeedRef.current,
          repeatMode: repeatModeRef.current,
          playerTheme: playerThemeRef.current,
          playerV2Prefs: playerV2PrefsRef.current,
          selectedSurahIds: [...selectedSurahIdsRef.current],
        };
        lastPushedSettings.current = settingsSignature(localPayload);
        await upsertSettingsRef.current(localPayload);
      }
      if (!cancelled) setSettingsReady(true);

      if (!didHydrateCloud.current) {
        didHydrateCloud.current = true;
        const remote = await fetchPlaybackState();
        if (cancelled || !remote) return;
        applyRemoteRow(remote);

        const isOtherDevicePlaying =
          remote.is_playing &&
          Boolean(remote.device_id) &&
          remote.device_id !== localDeviceId.current;

        if (!isOtherDevicePlaying && !currentTrackRef.current) {
          hydratePlaybackState({
            reciterId: remote.reciter_id,
            moshafId: remote.moshaf_id,
            surahId: remote.surah_id,
            positionSeconds: remote.position_seconds,
          });
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    user,
    isLoadingReciters,
    syncFavoritesMerge,
    setFavorites,
    fetchPlaybackState,
    hydratePlaybackState,
  ]);

  useEffect(() => {
    if (!user) {
      didHydrateCloud.current = false;
      setSettingsReady(false);
      lastPushedSettings.current = '';
      pendingSettingsSigRef.current = null;
      suppressRemoteSettingsUntilRef.current = 0;
      lastRemoteSettingsAtRef.current = 0;
      weOwnPlaybackRef.current = false;
      lastPushKey.current = '';
      lastRemoteKeyRef.current = '';
      pausedForRemoteRef.current = false;
      setRemoteSession(null);
      clearPauseTimer();
      if (settingsPushTimer.current !== null) {
        window.clearTimeout(settingsPushTimer.current);
        settingsPushTimer.current = null;
      }
    }
  }, [user, setRemoteSession]);

  // Push favorite changes after login merge
  useEffect(() => {
    if (!user) return;
    const signature = JSON.stringify([...favorites].sort((a, b) => a - b));
    if (signature === lastPushedFavorites.current) return;

    const previous = new Set<number>(
      lastPushedFavorites.current
        ? (JSON.parse(lastPushedFavorites.current) as number[])
        : []
    );
    const next = new Set(favorites);

    const added = favorites.filter((id) => !previous.has(id));
    const removed = [...previous].filter((id) => !next.has(id));

    lastPushedFavorites.current = signature;

    added.forEach((id) => {
      void setFavoriteReciter(id, true);
    });
    removed.forEach((id) => {
      void setFavoriteReciter(id, false);
    });
  }, [favorites, user, setFavoriteReciter]);

  // Debounced push of player prefs + selected surah loop (live multi-device)
  useEffect(() => {
    if (!user || !settingsReady) return;

    const payload = {
      volume,
      playbackSpeed,
      repeatMode,
      playerTheme,
      playerV2Prefs,
      selectedSurahIds: selectedSurahKey
        ? selectedSurahKey.split(',').map((id) => Number(id))
        : [],
    };
    const signature = settingsSignature(payload);
    if (
      signature === lastPushedSettings.current &&
      pendingSettingsSigRef.current === null
    ) {
      return;
    }

    // Mark dirty immediately so polls/realtime cannot clobber the click
    queueLocalSettings(signature);

    if (settingsPushTimer.current !== null) {
      window.clearTimeout(settingsPushTimer.current);
    }
    settingsPushTimer.current = window.setTimeout(() => {
      void (async () => {
        try {
          await upsertSettingsRef.current(payload);
          if (pendingSettingsSigRef.current === signature) {
            lastPushedSettings.current = signature;
            pendingSettingsSigRef.current = null;
            lastRemoteSettingsAtRef.current = Date.now();
          }
        } catch (err) {
          console.warn('settings push failed', err);
        } finally {
          settingsPushTimer.current = null;
        }
      })();
    }, SETTINGS_PUSH_DELAY_MS);

    return () => {
      if (settingsPushTimer.current !== null) {
        window.clearTimeout(settingsPushTimer.current);
        settingsPushTimer.current = null;
      }
    };
  }, [
    user,
    settingsReady,
    volume,
    playbackSpeed,
    repeatMode,
    playerTheme,
    playerV2Prefs,
    selectedSurahKey,
  ]);

  // Claim / release ownership from local transport state
  useEffect(() => {
    if (!user || !currentTrack) return;

    if (playbackStatus === 'playing') {
      clearPauseTimer();
      // Explicit local play steals ownership (like Spotify)
      pushPlayback(true, { allowSteal: true });
      return;
    }

    if (playbackStatus === 'paused' && weOwnPlaybackRef.current) {
      clearPauseTimer();
      pausePushTimer.current = window.setTimeout(() => {
        if (playbackStatusRef.current === 'paused' && weOwnPlaybackRef.current) {
          pushPlayback(false);
        }
      }, PAUSE_PUSH_DELAY_MS);
    }

    return () => clearPauseTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, playbackStatus, currentTrack?.reciter.id, currentTrack?.surah.id, currentTrack?.moshaf.id]);

  // Heartbeat while owning — use audio element time, not stale React state
  useEffect(() => {
    if (!user || !currentTrack || playbackStatus !== 'playing') return;

    const timer = window.setInterval(() => {
      if (!weOwnPlaybackRef.current) return;
      if (remoteSessionRef.current) return;
      if (playbackStatusRef.current !== 'playing') return;
      lastPushKey.current = ''; // force position write
      pushPlayback(true);
    }, HEARTBEAT_MS);

    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, currentTrack?.reciter.id, currentTrack?.surah.id, playbackStatus]);

  useEffect(() => {
    const flush = () => {
      if (!user || !currentTrackRef.current) return;
      if (!weOwnPlaybackRef.current && playbackStatusRef.current !== 'playing') return;
      lastPushKey.current = '';
      pushPlayback(playbackStatusRef.current === 'playing');
    };
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onHide);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Realtime + polling (playback + settings/loop)
  useEffect(() => {
    if (!user || !supabase) return;
    const client = supabase;
    const userId = user.id;

    void client.auth.getSession().then(({ data }) => {
      const token = data.session?.access_token;
      if (token) client.realtime.setAuth(token);
    });

    const channel = client
      .channel(`sawra-sync-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sawra_playback_state',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as SawraPlaybackRow | null;
          if (!row || typeof row.reciter_id !== 'number') return;
          if (payload.eventType === 'DELETE') {
            setRemoteSessionRef.current(null);
            return;
          }
          applyRemoteRow(row);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sawra_user_settings',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as SawraUserSettingsRow | null;
          if (!row || payload.eventType === 'DELETE') return;
          applyRemoteSettings(row);
        }
      )
      .subscribe();

    const pollPlayback = async () => {
      const remote = await fetchPlaybackRef.current();
      if (!remote) return;
      applyRemoteRow(remote);
    };

    const pollSettings = async () => {
      const remote = await fetchSettingsRef.current();
      if (!remote) return;
      applyRemoteSettings(remote);
    };

    void pollPlayback();
    void pollSettings();
    const playbackPollId = window.setInterval(() => {
      void pollPlayback();
    }, POLL_MS);
    const settingsPollId = window.setInterval(() => {
      void pollSettings();
    }, SETTINGS_POLL_MS);

    return () => {
      window.clearInterval(playbackPollId);
      window.clearInterval(settingsPollId);
      void client.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return null;
};
