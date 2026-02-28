'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  OAuthProvider,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  type UserCredential,
} from 'firebase/auth';
import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import { getFirebaseAuth } from '@/src/lib/firebase';
import { setSyncUserId } from '@/src/lib/syncUser';
import { getFriendlyAuthErrorMessage } from '@/src/auth/authErrors';

// Native Google sign-in (expo-auth-session) – optional to avoid breaking web
let AuthSession: typeof import('expo-auth-session') | null = null;
let AppleAuth: typeof import('expo-apple-authentication') | null = null;
if (Platform.OS !== 'web') {
  try {
    AuthSession = require('expo-auth-session');
  } catch {
    // expo-auth-session not installed
  }
  try {
    AppleAuth = require('expo-apple-authentication');
  } catch {
    // expo-apple-authentication not installed
  }
}

const NOT_CONFIGURED_MSG = 'Sign-in is not available on this app.';
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';

type AuthState = {
  user: User | null;
  loading: boolean;
  error: string | null;
};

type AuthContextValue = AuthState & {
  signIn: (email: string, password: string) => Promise<UserCredential | null>;
  signUp: (email: string, password: string, displayName?: string) => Promise<UserCredential | null>;
  signInWithGoogle: () => Promise<UserCredential | null>;
  signInWithApple: () => Promise<UserCredential | null>;
  setDisplayName: (displayName: string) => Promise<boolean>;
  sendPasswordResetEmail: (email: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const auth = getFirebaseAuth();

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setSyncUserId(u?.uid ?? null);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [auth]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!auth) {
        setError(NOT_CONFIGURED_MSG);
        return null;
      }
      setError(null);
      try {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        if (!cred.user.emailVerified) {
          // Resend verification link on every failed attempt so the user always
          // has a fresh link, then sign them back out
          await sendEmailVerification(cred.user).catch(() => {});
          await firebaseSignOut(auth);
          setError(
            'Please verify your email before signing in. A new verification link has been sent to ' +
              email +
              '.'
          );
          return null;
        }
        return cred;
      } catch (e: unknown) {
        setError(getFriendlyAuthErrorMessage(e));
        return null;
      }
    },
    [auth]
  );

  const signUp = useCallback(
    async (email: string, password: string, displayName?: string) => {
      if (!auth) {
        setError(NOT_CONFIGURED_MSG);
        return null;
      }
      setError(null);
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (cred.user && displayName?.trim()) {
          await updateProfile(cred.user, { displayName: displayName.trim() });
        }
        // Send verification email — user must verify before they can sign in
        await sendEmailVerification(cred.user);
        // Sign out immediately so they are forced to verify first
        await firebaseSignOut(auth);
        return cred;
      } catch (e: unknown) {
        setError(getFriendlyAuthErrorMessage(e));
        return null;
      }
    },
    [auth]
  );

  const setDisplayName = useCallback(
    async (displayName: string) => {
      if (!auth?.currentUser) {
        setError(NOT_CONFIGURED_MSG);
        return false;
      }
      const name = displayName.trim();
      if (!name) return false;
      setError(null);
      try {
        await updateProfile(auth.currentUser, { displayName: name });
        return true;
      } catch (e: unknown) {
        setError(getFriendlyAuthErrorMessage(e));
        return false;
      }
    },
    [auth]
  );

  const signInWithGoogle = useCallback(async () => {
    if (!auth) {
      setError(NOT_CONFIGURED_MSG);
      return null;
    }
    setError(null);
    try {
      if (Platform.OS === 'web') {
        const cred = await signInWithPopup(auth, new GoogleAuthProvider());
        return cred;
      }
      // Native: use browser OAuth then Firebase credential. Always use Expo proxy
      // so redirect URI is https://auth.expo.io/... (allowed by Google Web client).
      // Works in Expo Go, dev builds, and APK without custom scheme in Google Cloud.
      if (!AuthSession || !GOOGLE_WEB_CLIENT_ID) {
        setError('Google sign-in is not set up. Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in .env and add the redirect URI in Google Cloud Console.');
        return null;
      }
      const useProxy = true;
      const redirectUri = AuthSession.makeRedirectUri({ useProxy });
      const request = await AuthSession.loadAsync(
        {
          clientId: GOOGLE_WEB_CLIENT_ID,
          redirectUri,
          scopes: ['openid', 'email', 'profile'],
          responseType: 'id_token' as const,
        },
        'https://accounts.google.com'
      );
      const result = await request.promptAsync({ useProxy });
      if (result.type !== 'success') {
        if (result.type === 'dismiss' || result.type === 'cancel') {
          setError('Sign-in was cancelled.');
        } else {
          const msg = getFriendlyAuthErrorMessage(result);
          setError(
            msg + (redirectUri ? ` Add this redirect URI in Google Cloud Console: ${redirectUri}` : '')
          );
        }
        return null;
      }
      const idToken = (result.params as { id_token?: string }).id_token;
      if (!idToken) {
        setError(
          'Google did not return a token. In Google Cloud Console, add this redirect URI: ' + redirectUri
        );
        return null;
      }
      const credential = GoogleAuthProvider.credential(idToken);
      const cred = await signInWithCredential(auth, credential);
      return cred;
    } catch (e: unknown) {
      setError(getFriendlyAuthErrorMessage(e));
      return null;
    }
  }, [auth]);

  const signInWithApple = useCallback(async () => {
    if (!auth) {
      setError(NOT_CONFIGURED_MSG);
      return null;
    }
    if (!AppleAuth) {
      setError('Sign in with Apple is not available.');
      return null;
    }
    const available = await AppleAuth.isAvailableAsync().catch(() => false);
    if (!available) {
      setError('Sign in with Apple is not available on this device.');
      return null;
    }
    setError(null);
    try {
      const rawNonce = Math.random().toString(36).slice(2) + Date.now().toString(36);
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce
      );
      const credential = await AppleAuth.signInAsync({
        requestedScopes: [
          AppleAuth.AppleAuthenticationScope.FULL_NAME,
          AppleAuth.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });
      const { identityToken } = credential;
      if (!identityToken) {
        setError('Apple did not return an identity token.');
        return null;
      }
      const provider = new OAuthProvider('apple.com');
      const appleCredential = provider.credential({
        idToken: identityToken,
        rawNonce,
      });
      const cred = await signInWithCredential(auth, appleCredential);
      if (cred.user && credential.fullName) {
        const given = credential.fullName.givenName ?? '';
        const family = credential.fullName.familyName ?? '';
        const displayName = [given, family].filter(Boolean).join(' ').trim();
        if (displayName) {
          await updateProfile(cred.user, { displayName }).catch(() => {});
        }
      }
      return cred;
    } catch (e: unknown) {
      const err = e as { code?: string };
      if (err?.code === 'ERR_REQUEST_CANCELED') {
        setError('Sign-in was cancelled.');
      } else {
        setError(getFriendlyAuthErrorMessage(e));
      }
      return null;
    }
  }, [auth]);

  const sendPasswordReset = useCallback(
    async (email: string) => {
      if (!auth) {
        setError(NOT_CONFIGURED_MSG);
        return false;
      }
      setError(null);
      try {
        await sendPasswordResetEmail(auth, email.trim());
        return true;
      } catch (e: unknown) {
        setError(getFriendlyAuthErrorMessage(e));
        return false;
      }
    },
    [auth]
  );

  const signOut = useCallback(async () => {
    if (!auth) return;
    setError(null);
    await firebaseSignOut(auth);
  }, [auth]);

  const clearError = useCallback(() => setError(null), []);

  const value: AuthContextValue = {
    user,
    loading,
    error,
    signIn,
    signUp,
    signInWithGoogle,
    signInWithApple,
    setDisplayName,
    sendPasswordResetEmail: sendPasswordReset,
    signOut,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
