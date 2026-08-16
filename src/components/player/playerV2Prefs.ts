export type PlayerBarDensity = 'compact' | 'comfortable' | 'expanded';
export type SeekStepSeconds = 5 | 10 | 15;

export interface PlayerV2Prefs {
  density: PlayerBarDensity;
  seekStep: SeekStepSeconds;
  showArabic: boolean;
  showGlow: boolean;
  alwaysShowVolume: boolean;
  showQuickControls: boolean;
}

export const DEFAULT_PLAYER_V2_PREFS: PlayerV2Prefs = {
  density: 'compact',
  seekStep: 10,
  showArabic: true,
  showGlow: true,
  alwaysShowVolume: false,
  showQuickControls: true,
};

const STORAGE_KEY = 'quran_streamer_player_v2_prefs';

export const loadPlayerV2Prefs = (): PlayerV2Prefs => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PLAYER_V2_PREFS;
    const parsed = JSON.parse(raw) as Partial<PlayerV2Prefs>;
    return { ...DEFAULT_PLAYER_V2_PREFS, ...parsed };
  } catch {
    return DEFAULT_PLAYER_V2_PREFS;
  }
};

export const savePlayerV2Prefs = (prefs: PlayerV2Prefs) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore quota / private mode
  }
};
