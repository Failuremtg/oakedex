import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import type { PurchasesPackage } from 'react-native-purchases';
import { Text } from '@/components/Themed';
import { charcoal, primary } from '@/constants/Colors';
import { useSubscription } from '@/src/subscription/SubscriptionContext';
import { hapticLight } from '@/src/lib/haptics';

const BORDER = 'rgba(255,255,255,0.15)';
const BORDER_SELECTED = 'rgba(255,207,28,0.7)';
const TEXT_SECONDARY = 'rgba(255,255,255,0.7)';
const GOLD = '#ffcf1c';

const FEATURES = [
  'Unlimited binders',
  'Custom binders (empty or multi-Pokémon)',
  'Export binders to PDF',
];

function packageLabel(pkg: PurchasesPackage): string {
  switch (pkg.packageType) {
    case 'MONTHLY': return 'Monthly';
    case 'ANNUAL':  return 'Yearly';
    case 'LIFETIME': return 'Lifetime';
    default: return pkg.identifier;
  }
}

function packageBadge(pkg: PurchasesPackage): string | null {
  if (pkg.packageType === 'ANNUAL') return 'Best value';
  if (pkg.packageType === 'LIFETIME') return 'One-time';
  return null;
}

export default function PaywallScreen() {
  const router = useRouter();
  const {
    isSubscriber,
    isLoading,
    offerings,
    error,
    purchasePackage,
    restorePurchases,
    refreshSubscription,
  } = useSubscription();

  const packages: PurchasesPackage[] = offerings?.current?.availablePackages ?? [];
  const [selectedPkg, setSelectedPkg] = useState<PurchasesPackage | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Auto-select the annual package (best value), or fallback to first
  useEffect(() => {
    if (packages.length === 0) return;
    const annual = packages.find((p) => p.packageType === 'ANNUAL');
    setSelectedPkg(annual ?? packages[0]);
  }, [packages.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isSubscriber) router.back();
  }, [isSubscriber, router]);

  const handlePurchase = useCallback(async () => {
    if (!selectedPkg) return;
    hapticLight();
    setMessage(null);
    setBusy(true);
    const { success, error: err } = await purchasePackage(selectedPkg);
    setBusy(false);
    if (success) {
      router.back();
    } else if (err) {
      setMessage(err);
    }
  }, [selectedPkg, purchasePackage, router]);

  const handleRestore = useCallback(async () => {
    hapticLight();
    setMessage(null);
    setBusy(true);
    const { success, error: err } = await restorePurchases();
    setBusy(false);
    if (success) {
      await refreshSubscription();
      router.back();
    } else if (err) {
      setMessage(err);
    }
  }, [restorePurchases, refreshSubscription, router]);

  const notAvailable = Platform.OS !== 'ios' && Platform.OS !== 'android';

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Oakedex Pro</Text>
      <Text style={styles.subtitle}>
        Unlock the full Pokédex experience.
      </Text>

      {/* Feature list */}
      <View style={styles.featureList}>
        {FEATURES.map((f) => (
          <View key={f} style={styles.featureRow}>
            <Text style={styles.featureCheck}>✓</Text>
            <Text style={styles.featureText}>{f}</Text>
          </View>
        ))}
      </View>

      {/* Error / success message */}
      {(error ?? message) ? (
        <Text style={styles.errorText}>{error ?? message}</Text>
      ) : null}

      {notAvailable && (
        <Text style={styles.hint}>
          In-app subscriptions are only available on iOS and Android.
        </Text>
      )}

      {/* Package selector */}
      {isLoading && packages.length === 0 ? (
        <ActivityIndicator size="large" color={primary} style={styles.spinner} />
      ) : !notAvailable && packages.length > 0 ? (
        <>
          <View style={styles.packageList}>
            {packages.map((pkg) => {
              const isSelected = selectedPkg?.identifier === pkg.identifier;
              const badge = packageBadge(pkg);
              return (
                <Pressable
                  key={pkg.identifier}
                  style={[styles.packageCard, isSelected && styles.packageCardSelected]}
                  onPress={() => { hapticLight(); setSelectedPkg(pkg); }}
                  disabled={busy}
                >
                  <View style={styles.packageCardInner}>
                    <View style={styles.packageCardLeft}>
                      <Text style={[styles.packageLabel, isSelected && styles.packageLabelSelected]}>
                        {packageLabel(pkg)}
                      </Text>
                      <Text style={styles.packagePrice}>
                        {pkg.product.priceString}
                        {pkg.packageType !== 'LIFETIME' ? (
                          <Text style={styles.packagePricePeriod}>
                            {pkg.packageType === 'MONTHLY' ? ' / mo' : ' / yr'}
                          </Text>
                        ) : null}
                      </Text>
                    </View>
                    {badge ? (
                      <View style={styles.badgeWrap}>
                        <Text style={styles.badgeText}>{badge}</Text>
                      </View>
                    ) : null}
                    <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            style={[styles.purchaseBtn, (busy || !selectedPkg) && styles.buttonDisabled]}
            disabled={busy || !selectedPkg}
            onPress={handlePurchase}
          >
            {busy ? (
              <ActivityIndicator color="#1a1a1a" size="small" />
            ) : (
              <Text style={styles.purchaseBtnText}>
                {selectedPkg ? `Get ${packageLabel(selectedPkg)}` : 'Select a plan'}
              </Text>
            )}
          </Pressable>

          <Pressable
            style={[styles.restoreBtn, (busy || isLoading) && styles.buttonDisabled]}
            disabled={busy || isLoading}
            onPress={handleRestore}
          >
            <Text style={styles.restoreBtnText}>Restore purchases</Text>
          </Pressable>
        </>
      ) : null}

      <Pressable
        style={styles.closeButton}
        onPress={() => { hapticLight(); router.back(); }}
      >
        <Text style={styles.closeButtonText}>Maybe later</Text>
      </Pressable>

      <Text style={styles.legalText}>
        Subscriptions auto-renew until cancelled. Manage in your{' '}
        {Platform.OS === 'ios' ? 'App Store' : 'Play Store'} account settings.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: charcoal },
  container: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 32,
    paddingBottom: 40,
    backgroundColor: charcoal,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: GOLD,
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: TEXT_SECONDARY,
    marginBottom: 24,
    textAlign: 'center',
  },
  featureList: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 10,
  },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  featureCheck: { fontSize: 15, color: GOLD, fontWeight: '700', lineHeight: 22 },
  featureText: { fontSize: 15, color: '#fff', flex: 1, lineHeight: 22 },
  errorText: { color: '#ef4444', fontSize: 14, marginBottom: 12, textAlign: 'center' },
  hint: { color: TEXT_SECONDARY, fontSize: 14, marginBottom: 16, textAlign: 'center' },
  spinner: { marginVertical: 24 },

  packageList: { gap: 10, marginBottom: 20 },
  packageCard: {
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: BORDER,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  packageCardSelected: {
    borderColor: BORDER_SELECTED,
    backgroundColor: 'rgba(255,207,28,0.08)',
  },
  packageCardInner: { flexDirection: 'row', alignItems: 'center' },
  packageCardLeft: { flex: 1 },
  packageLabel: { fontSize: 15, fontWeight: '600', color: TEXT_SECONDARY },
  packageLabelSelected: { color: GOLD },
  packagePrice: { fontSize: 18, fontWeight: '700', color: '#fff', marginTop: 2 },
  packagePricePeriod: { fontSize: 13, fontWeight: '400', color: TEXT_SECONDARY },
  badgeWrap: {
    backgroundColor: 'rgba(255,207,28,0.2)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 12,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: GOLD },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: { borderColor: GOLD },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: GOLD },

  purchaseBtn: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: GOLD,
    marginBottom: 12,
  },
  purchaseBtnText: { color: '#1a1a1a', fontWeight: '800', fontSize: 17 },
  restoreBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 20,
  },
  restoreBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  buttonDisabled: { opacity: 0.5 },
  closeButton: { alignSelf: 'center', paddingVertical: 8, marginBottom: 12 },
  closeButtonText: { color: TEXT_SECONDARY, fontSize: 15 },
  legalText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    lineHeight: 16,
  },
});
