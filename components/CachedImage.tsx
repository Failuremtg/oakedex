import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View, type ImageStyle } from 'react-native';
import { getOrDownloadImageUri } from '@/src/lib/imageCache';
import { getAnyOverrideUri } from '@/src/lib/cardImageOverrides';
import { getCloudAdminImageUrl } from '@/src/lib/cardImageCloud';
import { getFallbackCardImageUrl } from '@/src/lib/pokemonTcgApi';

type CachedImageProps = {
  /** Remote image URI (e.g. TCGdex). Cached locally after first load. */
  remoteUri: string | null | undefined;
  style?: ImageStyle;
  resizeMode?: 'contain' | 'cover' | 'stretch' | 'center';
  /** Card id for local overrides (user/admin). When set, override is shown if present. */
  cardId?: string;
  /** When image is missing and cardId is set, parent can pass the override URI after a user upload. */
  overrideUri?: string | null;
  /** When image is missing and cardId is set, show "Add image" and call this when tapped. */
  onUploadImage?: (cardId: string) => void;
};

/** If /high.png fails, try /low.png for the same card. */
function toLowQualityUrl(uri: string): string {
  if (uri.endsWith('/high.png')) return uri.replace(/\/high\.png$/, '/low.png');
  return uri;
}

/**
 * Shows a card image. Uses override (user/admin) first, then remote URI and cache.
 * When there is no URI or the image fails to load, shows "Image missing" and optionally "Add image".
 */
export function CachedImage({
  remoteUri,
  style,
  resizeMode = 'contain',
  cardId,
  overrideUri,
  onUploadImage,
}: CachedImageProps) {
  const [localOverrideUri, setLocalOverrideUri] = useState<string | null>(null);
  const [cloudAdminUri, setCloudAdminUri] = useState<string | null>(null);
  const [cachedUri, setCachedUri] = useState<string | null>(null);
  const [tryLowQuality, setTryLowQuality] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [fallbackUri, setFallbackUri] = useState<string | null>(null);
  const [triedFallback, setTriedFallback] = useState(false);

  const effectiveOverride = overrideUri ?? localOverrideUri ?? cloudAdminUri;

  useEffect(() => {
    if (!cardId) {
      setLocalOverrideUri(null);
      setCloudAdminUri(null);
      return;
    }
    let cancelled = false;
    getAnyOverrideUri(cardId).then((uri) => {
      if (!cancelled && uri) setLocalOverrideUri(uri);
    });
    getCloudAdminImageUrl(cardId).then((url) => {
      if (!cancelled && url) setCloudAdminUri(url);
    });
    return () => {
      cancelled = true;
    };
  }, [cardId]);

  // When we have no primary URI but have cardId, try secondary API (e.g. set list cards from TCGdex with no image).
  // Run fallback URL through image cache so it's downloaded and cached for next time.
  useEffect(() => {
    if (effectiveOverride || (remoteUri != null && remoteUri !== '')) return;
    if (!cardId || triedFallback) return;
    setTriedFallback(true);
    let cancelled = false;
    getFallbackCardImageUrl(cardId)
      .then((url) => {
        if (cancelled || !url) return;
        return getOrDownloadImageUri(url).then((cached) => {
          if (!cancelled && cached) setFallbackUri(cached);
          else if (!cancelled) setFallbackUri(url);
        });
      });
    return () => { cancelled = true; };
  }, [effectiveOverride, remoteUri, cardId, triedFallback]);

  useEffect(() => {
    if (effectiveOverride) {
      setCachedUri(null);
      setTryLowQuality(false);
      setLoadFailed(false);
      setFallbackUri(null);
      setTriedFallback(false);
      return;
    }
    if (remoteUri == null || remoteUri === '') {
      setCachedUri(null);
      setTryLowQuality(false);
      setLoadFailed(false);
      setFallbackUri(null);
      setTriedFallback(false);
      return;
    }
    setLoadFailed(false);
    setFallbackUri(null);
    setTriedFallback(false);
    if (remoteUri.startsWith('file://')) {
      setCachedUri(remoteUri);
      setTryLowQuality(false);
      return;
    }
    setTryLowQuality(false);
    let cancelled = false;
    getOrDownloadImageUri(remoteUri)
      .then((resolved) => {
        if (!cancelled && resolved && resolved !== remoteUri) setCachedUri(resolved);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [remoteUri, effectiveOverride]);

  const primaryUri = effectiveOverride ?? (remoteUri == null || remoteUri === '' ? null : (cachedUri ?? remoteUri));
  const uri = primaryUri ?? fallbackUri;
  const displayUri = uri != null && tryLowQuality ? toLowQualityUrl(uri) : uri;

  if (displayUri == null || loadFailed) {
    const showUpload = cardId && onUploadImage;
    return (
      <View style={[styles.missingWrap, style]}>
        <Text style={styles.missingText} numberOfLines={2}>Image missing</Text>
        {showUpload && (
          <Pressable
            style={({ pressed }) => [styles.addImageBtn, pressed && styles.addImageBtnPressed]}
            onPress={() => onUploadImage(cardId!)}
          >
            <Text style={styles.addImageBtnText}>Add image</Text>
          </Pressable>
        )}
      </View>
    );
  }

  const handleError = () => {
    if (displayUri?.endsWith('/high.png')) {
      setTryLowQuality(true);
      return;
    }
    if (cardId && !triedFallback) {
      setTriedFallback(true);
      getFallbackCardImageUrl(cardId).then((url) => {
        if (url) {
          getOrDownloadImageUri(url).then((cached) => {
            if (cached) setFallbackUri(cached);
            else setFallbackUri(url);
          });
        } else {
          setLoadFailed(true);
        }
      });
    } else {
      setLoadFailed(true);
    }
  };

  return (
    <Image
      source={{ uri: displayUri ?? undefined }}
      style={style}
      resizeMode={resizeMode}
      onError={handleError}
    />
  );
}

const styles = StyleSheet.create({
  missingWrap: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  missingText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    textAlign: 'center',
    paddingHorizontal: 6,
  },
  addImageBtn: {
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 6,
  },
  addImageBtnPressed: { opacity: 0.8 },
  addImageBtnText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
  },
});
