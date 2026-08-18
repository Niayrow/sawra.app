import { useEffect, useState } from 'react';

/** True when the tab/app is backgrounded or the screen is off. */
export function usePageHidden(): boolean {
  const [hidden, setHidden] = useState(() =>
    typeof document !== 'undefined' && document.visibilityState === 'hidden',
  );

  useEffect(() => {
    const sync = () => setHidden(document.visibilityState === 'hidden');
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);

  return hidden;
}
