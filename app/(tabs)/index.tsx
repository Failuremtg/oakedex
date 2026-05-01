import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import FontAwesome from '@expo/vector-icons/FontAwesome';
import { BinderCover } from '@/components/BinderCover';
import { GradedCardIcon } from '@/components/GradedCardIcon';
import { SyncLoadingScreen } from '@/components/SyncLoadingScreen';
import { WelcomeModal } from '@/components/WelcomeModal';
import { charcoal } from '@/constants/Colors';

import { getBinderColorHex } from '@/src/constants/binderColors';
import { useAuth } from '@/src/auth/AuthContext';
import { setEarlyAccessNewsShown, shouldShowEarlyAccessNews } from '@/src/lib/earlyAccessNews';
import {
  getCachedCollections,
  getCollectionsInDisplayOrder,
  loadCollectionsForDisplay,
  setCachedCollections,
  type Collection,
} from '@/src/lib/collections';
import { POKE_BALL_ICON_BW_SENTINEL } from '@/src/constants/collectionIcons';
import {
  getCollectionDisplayName,
  getCollectionIconUri,
  getCollectionSubtitle,
  isGrandmasterCollection,
} from '@/src/lib/collectionDisplay';
import { hapticLight } from '@/src/lib/haptics';
import { shouldShowOnboarding } from '@/src/lib/onboardingStorage';

/** Binder height as ratio of width (spine proportion). */
const BINDER_ASPECT = 120 / 88;
/** Content height for header (title + optional hint) – enough for title + subtitle. */
const HEADER_CONTENT_HEIGHT = 120;
/** Extra padding above header so title doesn’t sit under status bar. */
const HEADER_TOP_EXTRA = 20;
/** Extra space between header text and binder. */
const HEADER_BOTTOM_SPACING = 44;
/** Approximate tab bar content height (border strip + tabs); safe area added in component. */
const TAB_BAR_HEIGHT = 60;
/** Ribbon height (nameplate on binder). */
const RIBBON_HEIGHT = 56;
/** How much the ribbon overlaps the binder (sits on it). */
const RIBBON_OVERLAP = 10;
/** Nudge binder + ribbon down towards the menu. */
const BINDER_NUDGE_DOWN = 28;
/** Ribbon icon size (ball or sprite); can extend past ribbon. */
const RIBBON_ICON_SIZE = 72;

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [shelfItems, setShelfItems] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showNews, setShowNews] = useState(false);

  const bottomReserved = TAB_BAR_HEIGHT + insets.bottom;
  const headerHeight =
    insets.top + HEADER_TOP_EXTRA + HEADER_CONTENT_HEIGHT + HEADER_BOTTOM_SPACING;
  const swipeX = useRef(new Animated.Value(0)).current;

  const runSwipeHintAnimation = useCallback(() => {
    if (shelfItems.length <= 1) return;
    swipeX.setValue(0);
    const runOneSwipe = () =>
      Animated.sequence([
        Animated.timing(swipeX, { toValue: 14,  duration: 200, useNativeDriver: true }),
        Animated.timing(swipeX, { toValue: -14, duration: 200, useNativeDriver: true }),
        Animated.timing(swipeX, { toValue: 14,  duration: 200, useNativeDriver: true }),
        Animated.timing(swipeX, { toValue: 0,   duration: 200, useNativeDriver: true }),
      ]);
    // Track all three animation instances so we can stop them on cleanup
    const a1 = runOneSwipe();
    a1.start();
    const t2 = setTimeout(() => { const a2 = runOneSwipe(); a2.start(); }, 800);
    const t3 = setTimeout(() => { const a3 = runOneSwipe(); a3.start(); }, 1600);
    return () => {
      clearTimeout(t2);
      clearTimeout(t3);
      a1.stop();
      swipeX.stopAnimation();
    };
  }, [shelfItems.length, swipeX]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoadError(false);
      const cached = getCachedCollections();
      if (cached != null && cached.length >= 0) {
        setShelfItems(cached);
        setLoading(false);
      }
      (async () => {
        try {
          const list = await loadCollectionsForDisplay().then(getCollectionsInDisplayOrder);
          if (!cancelled) {
            setShelfItems(list);
            setCachedCollections(list);
          }
        } catch {
          // Only show error if we have no cached data to fall back on
          if (!cancelled && (getCachedCollections()?.length ?? 0) === 0) {
            setLoadError(true);
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

/** Onboarding: show once on first app open (this session check). */
  const onboardingCheckedRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (onboardingCheckedRef.current) return;
      onboardingCheckedRef.current = true;
      shouldShowOnboarding().then((show) => {
        if (show) router.replace('/onboarding');
      });
    }, [router])
  );

  // Early access popup: show first time user logs in, then every 48h on app open.
  const newsCheckedRef = useRef<string | null>(null);
  useFocusEffect(
    useCallback(() => {
      const uid = user?.uid ?? null;
      if (!uid) return;
      // Prevent repeated checks on rapid focus changes for same uid.
      if (newsCheckedRef.current === uid) return;
      newsCheckedRef.current = uid;
      let cancelled = false;
      shouldShowEarlyAccessNews(uid).then((show) => {
        if (!cancelled) setShowNews(show);
      });
      return () => {
        cancelled = true;
      };
    }, [user?.uid])
  );

  const dismissNews = useCallback(async () => {
    const uid = user?.uid;
    if (uid) await setEarlyAccessNewsShown(uid);
    setShowNews(false);
  }, [user?.uid]);

  useFocusEffect(
    useCallback(() => {
      const cleanup = runSwipeHintAnimation();
      return () => cleanup?.();
    }, [runSwipeHintAnimation])
  );

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      const idx = viewableItems[0]?.index;
      if (idx != null) setCurrentIndex(idx);
    },
    []
  );
  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  if (loading) {
    return (
      <View style={styles.screen}>
        <SyncLoadingScreen statusText="Loading collections..." />
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <Text style={styles.errorMsg}>Couldn't load your collections.</Text>
        <Pressable
          style={({ pressed }) => [styles.retryBtn, pressed && styles.cardPressed]}
          onPress={() => {
            hapticLight();
            setLoadError(false);
            setLoading(true);
            loadCollectionsForDisplay()
              .then(getCollectionsInDisplayOrder)
              .then((list) => { setShelfItems(list); setCachedCollections(list); })
              .catch(() => setLoadError(true))
              .finally(() => setLoading(false));
          }}
        >
          <Text style={styles.retryBtnText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const contentHeight = screenHeight - headerHeight - bottomReserved;
  const pad = 32;
  const maxBinderHeight = contentHeight - RIBBON_HEIGHT + RIBBON_OVERLAP;
  const binderWidth = Math.min(
    screenWidth - pad * 2,
    maxBinderHeight / BINDER_ASPECT
  );
  const binderHeight = binderWidth * BINDER_ASPECT;

  const renderPage = ({ item: coll }: { item: Collection }) => (
      <View
        style={[
          styles.page,
          styles.pageBottomAlign,
          {
            width: screenWidth,
            paddingBottom: 16,
            paddingTop: BINDER_NUDGE_DOWN,
          },
        ]}
      >
        <View style={styles.binderWithRibbon}>
          <Pressable
            style={({ pressed }) => [styles.binderPressable, pressed && styles.cardPressed]}
            onPress={() => {
              hapticLight();
              router.push(`/binder/${coll.id}`);
            }}
          >
            <BinderCover
              width={binderWidth}
              height={binderHeight}
              color={getBinderColorHex(coll.binderColor)}
            />
          </Pressable>
          <View style={[styles.ribbon, { width: binderWidth }]}>
            <View style={styles.ribbonFold} />
            <View style={styles.ribbonInner}>
              <View style={styles.ribbonTextWrap}>
                <Text style={styles.ribbonText} numberOfLines={1}>
                  {getCollectionDisplayName(coll)}
                </Text>
                <Text style={styles.ribbonSubtitle} numberOfLines={1}>
                  {getCollectionSubtitle(coll)}
                </Text>
              </View>
              <View style={styles.ribbonIconWrap}>
                <View style={styles.ribbonIconOuter}>
                  {coll.type === 'graded' ? (
                    <View style={styles.ribbonIcon}>
                      <GradedCardIcon size={RIBBON_ICON_SIZE - 10} />
                    </View>
                  ) : (
                    <Image
                      source={
                        (() => {
                          const uri = getCollectionIconUri(coll);
                          return uri === POKE_BALL_ICON_BW_SENTINEL ? require('@/assets/images/pokeball-bw.png') : { uri };
                        })()
                      }
                      style={styles.ribbonIcon}
                      resizeMode="contain"
                    />
                  )}
                  {isGrandmasterCollection(coll) && (
                    <View style={styles.ribbonStarBadge} pointerEvents="none">
                      <FontAwesome name="star" size={16} color="#000" style={styles.ribbonStarOutline} />
                      <FontAwesome name="star" size={12} color="#f0c030" style={styles.ribbonStarFill} />
                    </View>
                  )}
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>
  );

  if (shelfItems.length === 0) {
    return (
      <>
        <WelcomeModal
          visible={!!user?.uid && showNews}
          onDismiss={dismissNews}
          onOpenFeedback={() => router.push('/(tabs)/settings?feedback=1' as any)}
        />
        <View style={styles.screen}>
          <View style={[styles.headerOuter, { paddingTop: insets.top + HEADER_TOP_EXTRA }]}>
            <View style={styles.headerContent}>
              <Image
                source={require('@/assets/images/oakedex-logo.png')}
                style={styles.headerLogo}
                resizeMode="contain"
              />
            </View>
          </View>
          <View style={[styles.binderArea, styles.pageBottomAlign]}>
            <Pressable
              style={({ pressed }) => [styles.binderPressable, pressed && styles.cardPressed]}
              onPress={() => {
                hapticLight();
                router.push('/(tabs)/binder?add=1');
              }}
            >
              <View style={[styles.page, { width: screenWidth, paddingBottom: 16, paddingTop: BINDER_NUDGE_DOWN }]}>
                <View style={styles.binderWithRibbon}>
                  <BinderCover
                    width={binderWidth}
                    height={binderHeight}
                    color="#6b6b6b"
                  />
                  <View style={[styles.ribbon, { width: binderWidth }]}>
                    <View style={styles.ribbonFold} />
                    <View style={styles.ribbonInner}>
                      <View style={styles.ribbonTextWrap}>
                        <Text style={styles.ribbonText} numberOfLines={1}>
                          No binders yet
                        </Text>
                        <Text style={styles.ribbonSubtitle} numberOfLines={1}>
                          Tap to add your first collection
                        </Text>
                      </View>
                      <View style={styles.ribbonIconWrap}>
                        <View style={styles.ribbonIconOuter}>
                          <FontAwesome name="plus" size={36} color="rgba(255,255,255,0.9)" />
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            </Pressable>
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <WelcomeModal
        visible={!!user?.uid && showNews}
        onDismiss={dismissNews}
        onOpenFeedback={() => router.push('/(tabs)/settings?feedback=1' as any)}
      />
      <View style={styles.screen}>
        <View
          style={[
            styles.headerOuter,
            {
              paddingTop: insets.top + HEADER_TOP_EXTRA,
              minHeight: headerHeight,
            },
          ]}
        >
        <View style={styles.headerContent}>
          <Image
            source={require('@/assets/images/oakedex-logo.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          {shelfItems.length > 1 && (
            <Animated.Text
              style={[styles.swipeHint, { transform: [{ translateX: swipeX }] }]}
            >
              Swipe to go to next collection
            </Animated.Text>
          )}
        </View>
      </View>
      <View style={styles.binderArea}>
        <FlatList
          data={shelfItems}
          keyExtractor={(item) => item.id}
          renderItem={renderPage}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToAlignment="start"
          snapToInterval={screenWidth}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          getItemLayout={(_, index) => ({
            length: screenWidth,
            offset: screenWidth * index,
            index,
          })}
        />
      </View>
    </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: charcoal,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorMsg: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    textAlign: 'center',
    marginHorizontal: 32,
    marginBottom: 16,
  },
  retryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  retryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  headerOuter: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: HEADER_BOTTOM_SPACING,
  },
  headerContent: {
    height: HEADER_CONTENT_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerLogo: {
    height: 66,
    width: 240,
  },
  binderArea: {
    flex: 1,
  },
  swipeHint: {
    fontSize: 17,
    color: '#fff',
    opacity: 0.85,
    marginTop: 8,
    textAlign: 'center',
  },
  page: {
    flex: 1,
    alignItems: 'center',
  },
  pageBottomAlign: {
    justifyContent: 'flex-end',
  },
  binderWithRibbon: {
    alignItems: 'center',
    overflow: 'visible',
  },
  binderPressable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardPressed: { opacity: 0.9 },
  emptyPage: { flex: 1 },
  ribbon: {
    height: RIBBON_HEIGHT,
    marginTop: -RIBBON_OVERLAP,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderBottomWidth: 0,
    overflow: 'visible',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  ribbonFold: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  ribbonInner: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    gap: 10,
    overflow: 'visible',
  },
  ribbonTextWrap: { flex: 1, justifyContent: 'center', minWidth: 0 },
  ribbonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  ribbonSubtitle: {
    fontSize: 12,
    opacity: 0.85,
    color: '#fff',
    textAlign: 'center',
    marginTop: 2,
  },
  ribbonIconWrap: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
  },
  ribbonIconOuter: {
    position: 'relative',
    width: RIBBON_ICON_SIZE,
    height: RIBBON_ICON_SIZE,
  },
  ribbonIcon: {
    width: RIBBON_ICON_SIZE,
    height: RIBBON_ICON_SIZE,
  },
  ribbonStarBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ribbonStarOutline: { position: 'absolute' },
  ribbonStarFill: { position: 'absolute' },
});
