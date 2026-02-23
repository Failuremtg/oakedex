/**
 * Maps Firebase Auth error codes to user-friendly messages.
 * Never exposes "Firebase" or technical codes to the user.
 */
const FIREBASE_AUTH_MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'Wrong email or password.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/user-not-found': 'No account found with this email.',
  'auth/wrong-password': 'Wrong email or password.',
  'auth/email-already-in-use': 'This email is already registered. Try signing in instead.',
  'auth/weak-password': 'Password is too weak. Use at least 6 characters.',
  'auth/operation-not-allowed': 'This sign-in method is not enabled. Please use email or try again later.',
  'auth/too-many-requests': 'Too many attempts. Please try again later.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
  'auth/popup-closed-by-user': 'Sign-in was cancelled.',
  'auth/cancelled-popup-request': 'Sign-in was cancelled.',
  'auth/account-exists-with-different-credential': 'An account already exists with this email using a different sign-in method. Try signing in with that method.',
  'auth/credential-already-in-use': 'This sign-in method is already linked to another account.',
  'auth/requires-recent-login': 'Please sign out and sign in again to continue.',
};

export function getFriendlyAuthErrorMessage(error: unknown): string {
  const err = error as { code?: string; message?: string };
  const code = err?.code;
  if (code && FIREBASE_AUTH_MESSAGES[code]) {
    return FIREBASE_AUTH_MESSAGES[code];
  }
  const msg = err?.message ?? '';
  if (typeof msg === 'string' && msg.includes('auth/')) {
    const match = msg.match(/auth\/[a-z-]+/);
    if (match && FIREBASE_AUTH_MESSAGES[match[0]]) {
      return FIREBASE_AUTH_MESSAGES[match[0]];
    }
  }
  return 'Something went wrong. Please try again.';
}
