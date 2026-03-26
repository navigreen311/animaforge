import * as FileSystem from 'expo-file-system';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const IMAGE_CACHE_DIR = `${FileSystem.cacheDirectory}animaforge/images/`;
const VIDEO_CACHE_DIR = `${FileSystem.cacheDirectory}animaforge/videos/`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Derive a deterministic file name from the URL so we can look it up later.
 */
function hashKey(url: string): string {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const ch = url.charCodeAt(i);
    hash = ((hash << 5) - hash + ch) | 0;
  }
  return Math.abs(hash).toString(36);
}

function extensionFromUrl(url: string): string {
  const match = url.match(/\.(\w{3,4})(?:[?#]|$)/);
  return match ? `.${match[1]}` : '';
}

async function ensureDir(dir: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
}

// ---------------------------------------------------------------------------
// Image caching
// ---------------------------------------------------------------------------

/**
 * Download an image from url and persist it in the local file-system cache.
 *
 * @returns The local file:// URI of the cached image.
 */
export async function cacheImage(url: string): Promise<string> {
  await ensureDir(IMAGE_CACHE_DIR);

  const key = hashKey(url);
  const ext = extensionFromUrl(url) || '.jpg';
  const localPath = `${IMAGE_CACHE_DIR}${key}${ext}`;

  const info = await FileSystem.getInfoAsync(localPath);
  if (info.exists) {
    return localPath;
  }

  const download = await FileSystem.downloadAsync(url, localPath);
  return download.uri;
}

/**
 * Return the local URI if the image has been cached, otherwise null.
 */
export async function getCachedImage(url: string): Promise<string | null> {
  const key = hashKey(url);
  const ext = extensionFromUrl(url) || '.jpg';
  const localPath = `${IMAGE_CACHE_DIR}${key}${ext}`;

  const info = await FileSystem.getInfoAsync(localPath);
  return info.exists ? localPath : null;
}

// ---------------------------------------------------------------------------
// Video caching
// ---------------------------------------------------------------------------

/**
 * Download a video at the given quality tier and cache it locally.
 *
 * @param url     - Remote video URL.
 * @param quality - Quality label (e.g. "720p", "1080p"). Used only to
 *                  distinguish cached variants of the same source.
 * @returns The local file:// URI of the cached video.
 */
export async function cacheVideo(
  url: string,
  quality: string = '720p',
): Promise<string> {
  await ensureDir(VIDEO_CACHE_DIR);

  const key = hashKey(`${url}__${quality}`);
  const ext = extensionFromUrl(url) || '.mp4';
  const localPath = `${VIDEO_CACHE_DIR}${key}${ext}`;

  const info = await FileSystem.getInfoAsync(localPath);
  if (info.exists) {
    return localPath;
  }

  const download = await FileSystem.downloadAsync(url, localPath);
  return download.uri;
}

// ---------------------------------------------------------------------------
// Cache maintenance
// ---------------------------------------------------------------------------

/**
 * Remove all cached media (images + videos).
 */
export async function clearCache(): Promise<void> {
  const imgInfo = await FileSystem.getInfoAsync(IMAGE_CACHE_DIR);
  if (imgInfo.exists) {
    await FileSystem.deleteAsync(IMAGE_CACHE_DIR, { idempotent: true });
  }

  const vidInfo = await FileSystem.getInfoAsync(VIDEO_CACHE_DIR);
  if (vidInfo.exists) {
    await FileSystem.deleteAsync(VIDEO_CACHE_DIR, { idempotent: true });
  }
}

/**
 * Return the total number of bytes consumed by cached media.
 */
export async function getCacheSize(): Promise<number> {
  let total = 0;

  for (const dir of [IMAGE_CACHE_DIR, VIDEO_CACHE_DIR]) {
    const info = await FileSystem.getInfoAsync(dir);
    if (!info.exists) continue;

    const files = await FileSystem.readDirectoryAsync(dir);
    for (const file of files) {
      const fileInfo = await FileSystem.getInfoAsync(`${dir}${file}`);
      if (fileInfo.exists && 'size' in fileInfo) {
        total += fileInfo.size ?? 0;
      }
    }
  }

  return total;
}
