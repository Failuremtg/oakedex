/**
 * On-demand image cache for card images. Downloads to local storage when first
 * displayed; subsequent views use the cached file. Evicts oldest files when over limit.
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  cacheDirectory,
  deleteAsync,
  downloadAsync,
  getInfoAsync,
  makeDirectoryAsync,
} from 'expo-file-system/legacy';
import { normalizeTcgdexImageUrl } from './tcgdex';

const CACHE_DIR = 'oakedex-card-images';
const MANIFEST_KEY = '@oakedex/imagecache/manifest';
const MAX_CACHE_BYTES = 80 * 1024 * 1024; // 80MB
const MAX_CONCURRENT_DOWNLOADS = 4;

// Many cards can render at once (e.g. Unown picker). Without throttling/deduping,
// we can end up with dozens of concurrent downloads + AsyncStorage writes, which
// can stall rendering and make lists appear to "stop" loading images.
const inFlightByKey = new Map<string, Promise<string>>();
let activeDownloads = 0;
const downloadQueue: Array<() => void> = [];
let manifestMutex: Promise<void> = Promise.resolve();

async function withManifestLock<T>(fn: () => Promise<T>): Promise<T> {
  const prev = manifestMutex;
  let release!: () => void;
  manifestMutex = new Promise<void>((r) => { release = r; });
  await prev;
  try {
    return await fn();
  } finally {
    release();
  }
}

async function acquireDownloadSlot(): Promise<void> {
  if (activeDownloads < MAX_CONCURRENT_DOWNLOADS) {
    activeDownloads += 1;
    return;
  }
  await new Promise<void>((resolve) => {
    downloadQueue.push(() => {
      activeDownloads += 1;
      resolve();
    });
  });
}
function releaseDownloadSlot(): void {
  activeDownloads = Math.max(0, activeDownloads - 1);
  const next = downloadQueue.shift();
  if (next) next();
}

interface ManifestEntry {
  key: string;
  uri: string;
  size: number;
  mtime: number;
}

interface Manifest {
  entries: ManifestEntry[];
  totalSize: number;
}

function hashUrl(url: string): string {
  let h = 0;
  const s = url;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h = (h << 5) - h + c;
    h = h & 0x7fffffff;
  }
  return String(h);
}

function isCacheAvailable(): boolean {
  return Platform.OS !== 'web' && cacheDirectory != null && cacheDirectory.length > 0;
}

async function getManifest(): Promise<Manifest> {
  const raw = await AsyncStorage.getItem(MANIFEST_KEY);
  if (raw == null) return { entries: [], totalSize: 0 };
  try {
    const data = JSON.parse(raw) as Manifest;
    return Array.isArray(data.entries) ? data : { entries: [], totalSize: 0 };
  } catch {
    return { entries: [], totalSize: 0 };
  }
}

async function saveManifest(m: Manifest): Promise<void> {
  await AsyncStorage.setItem(MANIFEST_KEY, JSON.stringify(m));
}

async function evictUntilUnderLimit(manifest: Manifest, newFileSize: number): Promise<Manifest> {
  const maxSize = MAX_CACHE_BYTES;
  let total = manifest.totalSize + newFileSize;
  const entries = [...manifest.entries].sort((a, b) => a.mtime - b.mtime);
  const kept: ManifestEntry[] = [];
  for (const e of entries) {
    if (total <= maxSize) {
      kept.push(e);
      continue;
    }
    try {
      await deleteAsync(e.uri, { idempotent: true });
    } catch {
      kept.push(e);
          continue;
    }
    total -= e.size;
  }
  return {
    entries: kept,
    totalSize: kept.reduce((s, e) => s + e.size, 0),
  };
}

/**
 * Returns a local file URI for the image, or the remote URI if cache is unavailable or download fails.
 * Normalizes TCGdex URLs before caching. Evicts oldest cached images when over 80MB.
 */
export async function getOrDownloadImageUri(remoteUri: string | null | undefined): Promise<string | null> {
  if (remoteUri == null || remoteUri === '') return null;
  const normalized = normalizeTcgdexImageUrl(remoteUri) ?? remoteUri;
  if (normalized === '') return null;

  if (!isCacheAvailable()) return normalized;

  const key = hashUrl(normalized);
  const existingUri = await withManifestLock(async () => {
    const manifest = await getManifest();
    const existing = manifest.entries.find((e) => e.key === key);
    if (!existing) return null;
    try {
      const info = await getInfoAsync(existing.uri);
      return info.exists ? existing.uri : null;
    } catch {
      return null;
    }
  });
  if (existingUri) return existingUri;

  const inFlight = inFlightByKey.get(key);
  if (inFlight) {
    try {
      return await inFlight;
    } catch {
      return normalized;
    }
  }

  const task = (async () => {
    const dirUri = `${cacheDirectory}${CACHE_DIR}/`;
    try {
      await makeDirectoryAsync(dirUri, { intermediates: true });
    } catch {
      return normalized;
    }
    const fileUri = `${dirUri}${key}.png`;
    await acquireDownloadSlot();
    try {
      const result = await downloadAsync(normalized, fileUri);
      const localUri = result.uri;

      await withManifestLock(async () => {
        const manifest = await getManifest();
        const existing = manifest.entries.find((e) => e.key === key);
        const info = await getInfoAsync(localUri);
        const size = (info as { size?: number }).size ?? 0;
        const mtime = Date.now();
        const newEntry: ManifestEntry = { key, uri: localUri, size, mtime };
        const withoutOld = existing ? manifest.entries.filter((e) => e.key !== key) : manifest.entries;
        const newTotal = manifest.totalSize - (existing?.size ?? 0) + size;
        let newManifest: Manifest = { entries: [...withoutOld, newEntry], totalSize: newTotal };
        newManifest = await evictUntilUnderLimit(newManifest, 0);
        await saveManifest(newManifest);
      });

      return localUri;
    } catch {
      return normalized;
    } finally {
      releaseDownloadSlot();
      inFlightByKey.delete(key);
    }
  })();

  inFlightByKey.set(key, task);
  return await task;
}
