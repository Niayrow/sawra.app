export interface WidgetPlaybackData {
  reciterName: string;
  surahName: string;
  surahId: number;
  surahArabic: string;
  isPlaying: boolean;
  progressPercent: number;
  updatedAt: number;
}

const WIDGET_STORAGE_KEY = 'sawra_widget_data';

export const readWidgetDataFromWeb = (): WidgetPlaybackData | null => {
  try {
    const raw = localStorage.getItem(WIDGET_STORAGE_KEY);
    return raw ? JSON.parse(raw) as WidgetPlaybackData : null;
  } catch {
    return null;
  }
};

export const writeWidgetDataToWeb = (data: WidgetPlaybackData) => {
  try {
    localStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage may be unavailable.
  }
};

export async function syncWidgetPlayback(data: WidgetPlaybackData): Promise<void> {
  writeWidgetDataToWeb(data);

  try {
    const { WidgetBridge } = await import('../native/WidgetBridge');
    await WidgetBridge.updateWidget({ ...data });
  } catch {
    // Web/PWA: localStorage only.
  }
}

export async function requestWidgetRefresh(): Promise<void> {
  try {
    const { WidgetBridge } = await import('../native/WidgetBridge');
    await WidgetBridge.refreshWidgets();
  } catch {
    // Not running in Capacitor.
  }
}
