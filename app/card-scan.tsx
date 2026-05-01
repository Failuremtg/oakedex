/**
 * Card scan screen — camera viewfinder + ML Kit OCR → card search → add to binder
 *
 * Modes:
 *  single — capture once, confirm match, add, return to binder
 *  bulk   — capture loop; each match added immediately with brief "Added!" overlay
 *
 * Params: collectionId, binderType (standard Collection type string)
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import TextRecognition from '@react-native-ml-kit/text-recognition';

import { CachedImage } from '@/components/CachedImage';
import { Text } from '@/components/Themed';
import { charcoal, primary } from '@/constants/Colors';
import { hapticLight } from '@/src/lib/haptics';
import { setSlot } from '@/src/lib/collections';
import { getCardsByName, filterCardsByNameStrict } from '@/src/lib/tcgdex';
import type { CardVariant } from '@/src/types';

type ScanMode = 'single' | 'bulk';
type ScanState = 'mode-select' | 'camera' | 'processing' | 'confirm' | 'saving' | 'done';

interface CardMatch {
  id: string;
  name: string;
  localId: string;
  image?: string | null;
  setName?: string;
}

/** Extract probable Pokémon name from OCR text block */
function extractCardName(text: string): string | null {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 1 && l.length < 40);

  // Pokémon card name is usually the first non-HP line at the top.
  // Skip lines that look like HP (e.g. "HP 120"), energy symbols, or numbers.
  for (const line of lines) {
    if (/^HP\s*\d+$/i.test(line)) continue;
    if (/^\d+$/.test(line)) continue;
    if (/^[WFRPLDCMN]$/.test(line)) continue; // single energy type letter
    if (line.length < 2) continue;
    return line;
  }
  return null;
}

/** Map binder type → slot key when adding a found card */
function buildSlotKey(binderType: string, cardId: string, variant: CardVariant = 'normal'): string {
  if (binderType === 'single_pokemon') return `en:${cardId}-${variant}`;
  // by_set, collect_them_all, master_set, master_dex — use card id as slot key
  return cardId;
}

export default function CardScanScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ collectionId: string; binderType: string }>();
  const { collectionId, binderType } = params;

  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<ScanMode>('single');
  const [scanState, setScanState] = useState<ScanState>('mode-select');
  const [match, setMatch] = useState<CardMatch | null>(null);
  const [statusMsg, setStatusMsg] = useState('');
  const addedOpacity = useRef(new Animated.Value(0)).current;

  const cameraRef = useRef<CameraView>(null);

  // ── permission guard ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!permission) return;
    if (!permission.granted && !permission.canAskAgain) {
      Alert.alert(
        'Camera permission required',
        'Please enable camera access in Settings to scan cards.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }
  }, [permission, router]);

  // ── capture + OCR ──────────────────────────────────────────────────────────
  const captureAndProcess = useCallback(async () => {
    if (!cameraRef.current) return;
    setScanState('processing');
    setStatusMsg('Reading card…');
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85, base64: false });
      if (!photo?.uri) throw new Error('No photo captured');

      setStatusMsg('Recognising text…');
      const result = await TextRecognition.recognize(photo.uri);
      const raw = result.text ?? '';

      const name = extractCardName(raw);
      if (!name) {
        Alert.alert(
          'No text found',
          "Couldn't read the card name. Try pointing the camera at the top of the card.",
          [{ text: 'Try again', onPress: () => setScanState('camera') }]
        );
        return;
      }

      setStatusMsg(`Searching for "${name}"…`);
      const cards = await getCardsByName('en', name, { exact: false });
      const filtered = filterCardsByNameStrict(cards ?? [], name);

      if (!filtered.length) {
        Alert.alert(
          'No match found',
          `Couldn't find a card matching "${name}". Try scanning again or search manually.`,
          [{ text: 'Try again', onPress: () => setScanState('camera') }]
        );
        return;
      }

      // Pick best match (first result after strict filter)
      const best = filtered[0];
      setMatch({ id: best.id, name: best.name ?? name, localId: best.localId ?? '', image: best.image });
      setScanState('confirm');
    } catch (err) {
      Alert.alert('Scan error', err instanceof Error ? err.message : 'Something went wrong.', [
        { text: 'Try again', onPress: () => setScanState('camera') },
      ]);
    }
  }, []);

  // ── add card to binder ─────────────────────────────────────────────────────
  const addCard = useCallback(async () => {
    if (!match || !collectionId) return;
    setScanState('saving');
    try {
      const slotKey = buildSlotKey(binderType, match.id);
      await setSlot(collectionId, slotKey, { cardId: match.id, variant: 'normal' });
      hapticLight();

      if (mode === 'single') {
        setScanState('done');
      } else {
        // Bulk: brief overlay, then back to camera
        Animated.sequence([
          Animated.timing(addedOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.delay(1000),
          Animated.timing(addedOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start(() => {
          setMatch(null);
          setScanState('camera');
        });
      }
    } catch {
      Alert.alert('Save error', 'Could not add card to your binder. Please try again.', [
        { text: 'OK', onPress: () => setScanState('confirm') },
      ]);
    }
  }, [match, collectionId, binderType, mode, addedOpacity]);

  // ── request camera permission if not yet granted ───────────────────────────
  const startCamera = useCallback(async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) return;
    }
    setScanState('camera');
  }, [permission, requestPermission]);

  // ── render: mode select ────────────────────────────────────────────────────
  if (scanState === 'mode-select') {
    return (
      <View style={styles.screen}>
        <Text style={styles.heading}>Card Scanner</Text>
        <Text style={styles.subheading}>
          Point the camera at the top of a Pokémon card to automatically add it to your binder.
        </Text>
        <Pressable
          style={({ pressed }) => [styles.modeCard, pressed && styles.pressed]}
          onPress={() => { hapticLight(); setMode('single'); startCamera(); }}
        >
          <Text style={styles.modeIcon}>📷</Text>
          <Text style={styles.modeTitle}>Single scan</Text>
          <Text style={styles.modeDesc}>Scan one card, confirm the match, then return to your binder.</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.modeCard, pressed && styles.pressed]}
          onPress={() => { hapticLight(); setMode('bulk'); startCamera(); }}
        >
          <Text style={styles.modeIcon}>⚡</Text>
          <Text style={styles.modeTitle}>Bulk scan</Text>
          <Text style={styles.modeDesc}>Scan multiple cards back-to-back without leaving the scanner.</Text>
        </Pressable>
        <Pressable style={styles.cancelBtn} onPress={() => { hapticLight(); router.back(); }}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>
    );
  }

  // ── render: camera viewfinder ──────────────────────────────────────────────
  if (scanState === 'camera') {
    return (
      <View style={styles.cameraScreen}>
        <CameraView ref={cameraRef} style={styles.camera} facing="back">
          {/* Targeting reticle */}
          <View style={styles.reticleOuter}>
            <View style={styles.reticle}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
            <Text style={styles.reticleHint}>
              {mode === 'bulk' ? 'Bulk mode — point at each card name' : 'Point at the card name'}
            </Text>
          </View>
        </CameraView>
        <View style={styles.cameraControls}>
          <Pressable
            style={({ pressed }) => [styles.captureBtn, pressed && styles.captureBtnPressed]}
            onPress={() => { hapticLight(); captureAndProcess(); }}
          >
            <View style={styles.captureInner} />
          </Pressable>
          <Pressable style={styles.cameraCancelBtn} onPress={() => { hapticLight(); router.back(); }}>
            <Text style={styles.cameraCancelText}>Done</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── render: processing spinner ─────────────────────────────────────────────
  if (scanState === 'processing') {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator size="large" color={primary} />
        <Text style={styles.processingText}>{statusMsg}</Text>
      </View>
    );
  }

  // ── render: confirm match ─────────────────────────────────────────────────
  if (scanState === 'confirm' && match) {
    return (
      <View style={styles.screen}>
        <Text style={styles.heading}>Is this the right card?</Text>
        {match.image ? (
          <CachedImage
            remoteUri={match.image}
            cardId={match.id}
            style={styles.cardImage}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.cardImagePlaceholder} />
        )}
        <Text style={styles.cardName}>{match.name}</Text>
        <Text style={styles.cardInfo}>#{match.localId}{match.setName ? ` · ${match.setName}` : ''}</Text>

        <Pressable
          style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}
          onPress={() => { hapticLight(); addCard(); }}
        >
          <Text style={styles.addBtnText}>✓  Add to binder</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.retryBtn, pressed && styles.pressed]}
          onPress={() => { hapticLight(); setMatch(null); setScanState('camera'); }}
        >
          <Text style={styles.retryBtnText}>Scan again</Text>
        </Pressable>
        <Pressable style={styles.cancelBtn} onPress={() => { hapticLight(); router.back(); }}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>

        {/* Bulk "Added!" overlay */}
        <Animated.View style={[styles.addedOverlay, { opacity: addedOpacity }]} pointerEvents="none">
          <Text style={styles.addedText}>Added!</Text>
        </Animated.View>
      </View>
    );
  }

  // ── render: done (single mode) ─────────────────────────────────────────────
  if (scanState === 'done') {
    return (
      <View style={[styles.screen, styles.centered]}>
        <Text style={styles.doneIcon}>✅</Text>
        <Text style={styles.doneText}>{match?.name} added to your binder!</Text>
        <Pressable
          style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}
          onPress={() => { hapticLight(); router.back(); }}
        >
          <Text style={styles.addBtnText}>Back to binder</Text>
        </Pressable>
      </View>
    );
  }

  // saving state fallback
  return (
    <View style={[styles.screen, styles.centered]}>
      <ActivityIndicator size="large" color={primary} />
      <Text style={styles.processingText}>Adding card…</Text>
    </View>
  );
}

const CORNER_SIZE = 22;
const CORNER_THICKNESS = 3;
const CORNER_COLOR = '#fff';

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: charcoal,
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 24,
  },
  centered: { justifyContent: 'center', alignItems: 'center' },
  heading: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subheading: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 20,
  },

  // Mode cards
  modeCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    gap: 6,
  },
  pressed: { opacity: 0.8 },
  modeIcon: { fontSize: 32 },
  modeTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  modeDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    lineHeight: 18,
  },

  // Camera
  cameraScreen: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  reticleOuter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80,
  },
  reticle: {
    width: 260,
    height: 80,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: CORNER_COLOR,
  },
  topLeft: { top: 0, left: 0, borderTopWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS },
  topRight: { top: 0, right: 0, borderTopWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS },
  reticleHint: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    marginTop: 12,
    textAlign: 'center',
  },
  cameraControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 44 : 24,
    paddingTop: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    gap: 16,
  },
  captureBtn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  captureBtnPressed: { opacity: 0.7 },
  captureInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#fff',
  },
  cameraCancelBtn: { paddingVertical: 8, paddingHorizontal: 24 },
  cameraCancelText: { color: 'rgba(255,255,255,0.85)', fontSize: 16, fontWeight: '600' },

  // Processing
  processingText: { color: 'rgba(255,255,255,0.8)', fontSize: 16, marginTop: 16 },

  // Confirm
  cardImage: { width: 180, height: 252, alignSelf: 'center', marginVertical: 16 },
  cardImagePlaceholder: {
    width: 180,
    height: 252,
    alignSelf: 'center',
    marginVertical: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
  },
  cardName: { fontSize: 20, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 4 },
  cardInfo: { fontSize: 13, color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginBottom: 20 },

  addBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: primary,
    marginBottom: 10,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  retryBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    marginBottom: 10,
  },
  retryBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  cancelBtn: { paddingVertical: 10, alignItems: 'center' },
  cancelText: { color: 'rgba(255,255,255,0.55)', fontSize: 15 },

  // Bulk "Added!" toast
  addedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(34,197,94,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  addedText: { fontSize: 36, fontWeight: '900', color: '#fff' },

  // Done screen
  doneIcon: { fontSize: 56, marginBottom: 16 },
  doneText: { fontSize: 18, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 28 },
});
