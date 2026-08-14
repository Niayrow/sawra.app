'use client';

import { useEffect } from 'react';
import { AuthProvider } from '../context/AuthContext';
import { AudioProvider } from '../context/AudioContext';
import { LibraryProvider } from '../context/LibraryContext';
import { initPostHog } from '../utils/posthog';
import { precacheAppShellInBackground } from '../utils/appShellPrecache';
import { isProd } from '../lib/env';

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initPostHog();
    if (!isProd || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' })
      .then((registration) => {
        void registration.update().catch(() => undefined);
        precacheAppShellInBackground();
      })
      .catch(() => undefined);
  }, []);

  return (
    <AuthProvider>
      <AudioProvider>
        <LibraryProvider>{children}</LibraryProvider>
      </AudioProvider>
    </AuthProvider>
  );
}
