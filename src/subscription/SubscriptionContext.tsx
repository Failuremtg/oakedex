import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Purchases, {
  type CustomerInfo,
  type PurchasesOfferings,
  type PurchasesPackage,
} from 'react-native-purchases';
import { useAuth } from '@/src/auth/AuthContext';
import { useIsAdmin } from '@/src/lib/adminConfig';

export const ENTITLEMENT_ID = 'oakedex_pro';

/**
 * Flip to false when beta testing is over and you want to enforce paywalls.
 * While true, all users are treated as subscribers regardless of RevenueCat status.
 */
const BETA_MODE = true;

const REVENUECAT_APPLE_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY ?? '';
const REVENUECAT_GOOGLE_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY ?? '';

type SubscriptionState = {
  isSubscriber: boolean;
  isLoading: boolean;
  offerings: PurchasesOfferings | null;
  error: string | null;
};

type SubscriptionContextValue = SubscriptionState & {
  purchasePackage: (pkg: PurchasesPackage) => Promise<{ success: boolean; error?: string }>;
  restorePurchases: () => Promise<{ success: boolean; error?: string }>;
  refreshSubscription: () => Promise<void>;
  presentCustomerCenter: () => Promise<void>;
  presentRCPaywall: () => Promise<'purchased' | 'restored' | 'cancelled' | 'not_presented' | 'error'>;
};

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

function isIapSupported(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

function getApiKey(): string {
  if (Platform.OS === 'ios') return REVENUECAT_APPLE_API_KEY.trim();
  if (Platform.OS === 'android') return REVENUECAT_GOOGLE_API_KEY.trim();
  return '';
}

function hasActiveEntitlement(customerInfo: CustomerInfo | null): boolean {
  if (!customerInfo?.entitlements?.active) return false;
  return ENTITLEMENT_ID in customerInfo.entitlements.active;
}

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { isAdmin: isAdminUser } = useIsAdmin(user);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshSubscription = useCallback(async () => {
    if (!isIapSupported() || !getApiKey()) {
      setLoading(false);
      setCustomerInfo(null);
      setOfferings(null);
      return;
    }
    setError(null);
    try {
      const info = await Purchases.getCustomerInfo();
      setCustomerInfo(info);
      const off = await Purchases.getOfferings();
      setOfferings(off);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      setCustomerInfo(null);
      setOfferings(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isIapSupported() || !getApiKey()) {
      setLoading(false);
      return;
    }
    try {
      Purchases.configure({ apiKey: getApiKey() });
    } catch {
      setLoading(false);
      return;
    }
    refreshSubscription();
  }, [refreshSubscription]);

  useEffect(() => {
    if (!isIapSupported() || !getApiKey() || !user?.uid) return;
    Purchases.logIn(user.uid).then(() => refreshSubscription()).catch(() => {});
  }, [user?.uid, refreshSubscription]);

  const purchasePackage = useCallback(
    async (pkg: PurchasesPackage): Promise<{ success: boolean; error?: string }> => {
      if (!isIapSupported()) return { success: false, error: 'Purchases not available.' };
      setError(null);
      try {
        const { customerInfo: info } = await Purchases.purchasePackage(pkg);
        setCustomerInfo(info);
        return { success: hasActiveEntitlement(info) };
      } catch (e) {
        const err = e as { userCancelled?: boolean };
        if (err?.userCancelled) return { success: false, error: 'Purchase was cancelled.' };
        const message = e instanceof Error ? e.message : String(e);
        setError(message);
        return { success: false, error: message };
      }
    },
    []
  );

  const restorePurchases = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!isIapSupported()) return { success: false, error: 'Restore not available.' };
    setError(null);
    try {
      const info = await Purchases.restorePurchases();
      setCustomerInfo(info);
      return { success: hasActiveEntitlement(info) };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      return { success: false, error: message };
    }
  }, []);

  /**
   * Opens RevenueCat's pre-built Customer Center UI.
   * Lets users manage, cancel, or get refunds for their subscription
   * without leaving the app. Requires react-native-purchases-ui.
   */
  const presentCustomerCenter = useCallback(async (): Promise<void> => {
    if (!isIapSupported()) return;
    try {
      const { default: RevenueCatUI } = await import('react-native-purchases-ui');
      await RevenueCatUI.presentCustomerCenter();
      // Refresh after customer center closes in case they cancelled/restored
      await refreshSubscription();
    } catch (e) {
      // Customer center not available or user dismissed — fail silently
      console.warn('[RC] presentCustomerCenter error:', e);
    }
  }, [refreshSubscription]);

  /**
   * Presents RevenueCat's remote-configured Paywall UI.
   * Requires a paywall to be configured in the RevenueCat dashboard.
   * Returns 'not_presented' if no paywall is configured — fall back
   * to your custom /paywall screen in that case.
   */
  const presentRCPaywall = useCallback(async (): Promise<
    'purchased' | 'restored' | 'cancelled' | 'not_presented' | 'error'
  > => {
    if (!isIapSupported()) return 'not_presented';
    try {
      const { default: RevenueCatUI, PAYWALL_RESULT } = await import('react-native-purchases-ui');
      const result = await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: ENTITLEMENT_ID,
      });
      await refreshSubscription();
      switch (result) {
        case PAYWALL_RESULT.PURCHASED: return 'purchased';
        case PAYWALL_RESULT.RESTORED:  return 'restored';
        case PAYWALL_RESULT.CANCELLED: return 'cancelled';
        case PAYWALL_RESULT.NOT_PRESENTED: return 'not_presented';
        default: return 'not_presented';
      }
    } catch (e) {
      console.warn('[RC] presentRCPaywall error:', e);
      return 'error';
    }
  }, [refreshSubscription]);

  const value: SubscriptionContextValue = {
    isSubscriber: BETA_MODE || isAdminUser || hasActiveEntitlement(customerInfo),
    isLoading: loading,
    offerings,
    error,
    purchasePackage,
    restorePurchases,
    refreshSubscription,
    presentCustomerCenter,
    presentRCPaywall,
  };

  return (
    <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>
  );
}

export function useSubscription(): SubscriptionContextValue {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider');
  return ctx;
}

export function useIsSubscriber(): boolean {
  return useSubscription().isSubscriber;
}
