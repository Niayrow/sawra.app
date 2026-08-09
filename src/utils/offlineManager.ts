const CACHE_NAME = 'sawra-audio-cache';

/**
 * Checks if Cache Storage is supported in the current environment
 */
export const isCacheSupported = (): boolean => {
  return typeof window !== 'undefined' && 'caches' in window;
};

/**
 * Checks if a specific audio URL is cached
 */
export const isUrlCached = async (url: string): Promise<boolean> => {
  if (!isCacheSupported()) return false;
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match(url);
    return !!response;
  } catch (error) {
    console.error('Error checking cache status:', error);
    return false;
  }
};

/**
 * Retrieves the local Blob URL for a cached audio file
 */
export const getCachedBlobUrl = async (url: string): Promise<string | null> => {
  if (!isCacheSupported()) return null;
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match(url);
    if (!response) return null;
    
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Error getting cached blob URL:', error);
    return null;
  }
};

/**
 * Downloads and caches an audio file with real-time progress callbacks.
 * Pass an AbortSignal to cancel mid-download.
 */
export const downloadAndCacheUrl = async (
  url: string,
  onProgress: (progress: number) => void,
  signal?: AbortSignal
): Promise<boolean> => {
  if (!isCacheSupported()) {
    throw new Error('Le stockage hors-ligne n\'est pas supporté par ce navigateur.');
  }

  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  try {
    onProgress(0);
    const response = await fetch(url, { signal });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const contentLength = response.headers.get('content-length');
    if (!contentLength) {
      // Fallback if content-length is not available: download directly and update progress to 100
      const cache = await caches.open(CACHE_NAME);
      await cache.put(url, response.clone());
      onProgress(100);
      return true;
    }

    const totalBytes = parseInt(contentLength, 10);
    let loadedBytes = 0;

    const reader = response.body?.getReader();
    if (!reader) {
      // Fallback if reader is not available
      const cache = await caches.open(CACHE_NAME);
      await cache.put(url, response.clone());
      onProgress(100);
      return true;
    }

    const abortReader = () => {
      void reader.cancel().catch(() => undefined);
    };
    if (signal) {
      if (signal.aborted) {
        abortReader();
        throw new DOMException('Aborted', 'AbortError');
      }
      signal.addEventListener('abort', abortReader, { once: true });
    }

    // Stream download to track progress (monotonic — never report a lower %)
    const chunks: BlobPart[] = [];
    let lastProgress = 0;
    try {
      while (true) {
        if (signal?.aborted) {
          throw new DOMException('Aborted', 'AbortError');
        }
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          loadedBytes += value.length;
          const progress = Math.min(99, Math.round((loadedBytes / totalBytes) * 100));
          if (progress > lastProgress) {
            lastProgress = progress;
            onProgress(progress);
          }
        }
      }
    } finally {
      if (signal) {
        signal.removeEventListener('abort', abortReader);
      }
    }

    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    const blob = new Blob(chunks, { type: 'audio/mpeg' });
    const cachedResponse = new Response(blob, {
      headers: {
        'content-type': 'audio/mpeg',
        'content-length': String(blob.size),
      },
    });

    const cache = await caches.open(CACHE_NAME);
    await cache.put(url, cachedResponse);
    onProgress(100);
    return true;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    console.error('Error downloading and caching track:', error);
    throw error;
  }
};

/**
 * Deletes a cached URL
 */
export const deleteCachedUrl = async (url: string): Promise<boolean> => {
  if (!isCacheSupported()) return false;
  try {
    const cache = await caches.open(CACHE_NAME);
    return await cache.delete(url);
  } catch (error) {
    console.error('Error deleting cached item:', error);
    return false;
  }
};

/**
 * Clears the entire audio cache
 */
export const clearAudioCache = async (): Promise<boolean> => {
  if (!isCacheSupported()) return false;
  try {
    return await caches.delete(CACHE_NAME);
  } catch (error) {
    console.error('Error clearing audio cache:', error);
    return false;
  }
};

export interface CacheInfo {
  count: number;
  totalSizeMb: number;
  cachedUrls: string[];
}

/**
 * Calculates total size and count of cached audio tracks
 */
export const getAudioCacheInfo = async (): Promise<CacheInfo> => {
  if (!isCacheSupported()) {
    return { count: 0, totalSizeMb: 0, cachedUrls: [] };
  }
  try {
    const cache = await caches.open(CACHE_NAME);
    const requests = await cache.keys();
    const urls = requests.map(req => req.url);
    
    let totalBytes = 0;
    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        try {
          const blob = await response.clone().blob();
          totalBytes += blob.size;
        } catch {
          // ignore size calc failures for individual corrupt entries
        }
      }
    }

    const totalSizeMb = parseFloat((totalBytes / (1024 * 1024)).toFixed(2));
    return {
      count: requests.length,
      totalSizeMb,
      cachedUrls: urls,
    };
  } catch (error) {
    console.error('Error getting cache info:', error);
    return { count: 0, totalSizeMb: 0, cachedUrls: [] };
  }
};
