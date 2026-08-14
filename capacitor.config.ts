import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Native shell loads the static export in `out/` (`npm run build:native`).
 * Alternative: point WebView at the live site with `server: { url: 'https://sawra.app' }`
 * (SSR on Vercel, no local `webDir` needed).
 */
const config: CapacitorConfig = {
  appId: 'app.sawra',
  appName: 'Sawra',
  webDir: 'out',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#020617',
      showSpinner: false,
    },
  },
  android: {
    allowMixedContent: true,
  },
  ios: {
    contentInset: 'automatic',
  },
};

export default config;
