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
  const manifest = await getManifest();
  const existing = manifest.entries.find((e) => e.key === key);
  if (existing) {
    try {
      const info = await getInfoAsync(existing.uri, { size: true });
      if (info.exists) return existing.uri;
    } catch {
      /* fall through to re-download */
    }
  }

  const dirUri = `${cacheDirectory}${CACHE_DIR}/`;
  try {
    await makeDirectoryAsync(dirUri, { intermediates: true });
  } catch {
    return normalized;
  }
  const fileUri = `${dirUri}${key}.png`;
  try {
    const result = await downloadAsync(normalized, fileUri);
    const localUri = result.uri;
    const info = await getInfoAsync(localUri, { size: true });
    const size = (info as { size?: number }).size ?? 0;
    const mtime = Date.now();
    const newEntry: ManifestEntry = { key, uri: localUri, size, mtime };
    const withoutOld = existing
      ? manifest.entries.filter((e) => e.key !== key)
      : manifest.entries;
    const newTotal = manifest.totalSize - (existing?.size ?? 0) + size;
    let newManifest: Manifest = {
      entries: [...withoutOld, newEntry],
      totalSize: newTotal,
    };
    newManifest = await evictUntilUnderLimit(newManifest, 0);
    await saveManifest(newManifest);
    return localUri;
  } catch {
    return normalized;
  }
}
