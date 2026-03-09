/**
 * Maps Firebase Auth error codes to user-friendly messages.
 * getFriendlyAuthErrorMessage returns message + error code in parentheses so you can look up the fix (see LOGIN_TROUBLESHOOTING.md).
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
  'auth/invalid-api-key': 'Please update the app to the latest version and try again.',
  'auth/api-key-not-valid': 'Please update the app to the latest version and try again.',
  'auth/configuration-not-found': 'Sign-in isn’t set up for this app yet. Try again after updating.',
  'auth/internal-error': 'Something went wrong on our side. Please try again in a moment.',
};

/** Extract the standard auth error code (e.g. auth/invalid-api-key) for debugging. Strips any extra text Firebase appends. */
export function getAuthErrorCode(error: unknown): string | null {
  const err = error as { code?: string; message?: string };
  const raw = err?.code && typeof err.code === 'string' ? err.code : String(err?.message ?? '');
  const match = raw.match(/auth\/[a-z0-9-]+/);
  return match ? match[0] : null;
}

/**
 * Returns a user-friendly message and appends the error code in parentheses so you can look up the fix.
 * Example: "Please update the app to the latest version and try again. (auth/invalid-api-key)"
 * See LOGIN_TROUBLESHOOTING.md for what each code means and how to fix it.
 */
export function getFriendlyAuthErrorMessage(error: unknown): string {
  const err = error as { code?: string; message?: string };
  const code = getAuthErrorCode(error);
  let message: string;
  if (code && FIREBASE_AUTH_MESSAGES[code]) {
    message = FIREBASE_AUTH_MESSAGES[code];
  } else {
    const msg = String(err?.message ?? '');
    if (msg.includes('auth/')) {
      const match = msg.match(/auth\/[a-z0-9-]+/);
      if (match && FIREBASE_AUTH_MESSAGES[match[0]]) {
        message = FIREBASE_AUTH_MESSAGES[match[0]];
      } else {
        message = 'We couldn’t sign you in. Check your email and password, and your connection, then try again.';
      }
    } else if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('connection')) {
      message = 'Check your internet connection and try again.';
    } else {
      message = 'We couldn’t sign you in. Check your email and password, and your connection, then try again.';
    }
  }
  return code ? `${message} (${code})` : message;
}
