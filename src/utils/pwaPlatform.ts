export type PwaPlatform = 'ios' | 'android' | 'desktop' | 'unknown';

/** True when the app already runs as an installed PWA / home-screen shortcut. */
export function isPwaStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    Boolean(nav.standalone)
  );
}

/** iPhone / iPad / iPod, including iPadOS reporting as Mac with touch. */
export function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  // iPadOS 13+ may spoof Macintosh
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
}

export function isAndroidDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent);
}

export function getPwaPlatform(): PwaPlatform {
  if (typeof navigator === 'undefined') return 'unknown';
  if (isIosDevice()) return 'ios';
  if (isAndroidDevice()) return 'android';
  if (/Windows|Macintosh|Linux|CrOS/i.test(navigator.userAgent)) return 'desktop';
  return 'unknown';
}

export function isMobilePwaCandidate(): boolean {
  const platform = getPwaPlatform();
  return platform === 'ios' || platform === 'android';
}

export function pwaInstallButtonLabel(platform: PwaPlatform): string {
  switch (platform) {
    case 'ios':
      return 'Sur l’écran d’accueil';
    case 'android':
      return 'Installer l’app';
    default:
      return 'Installer Sawra';
  }
}

export function pwaInstallHint(platform: PwaPlatform): string {
  switch (platform) {
    case 'ios':
      return 'Safari → Partager → Sur l’écran d’accueil';
    case 'android':
      return 'Chrome → menu ⋮ → Installer l’application';
    default:
      return 'Ajoutez Sawra comme application depuis votre navigateur';
  }
}
