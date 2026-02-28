/**
 * Display name filter: block profanity and reserve "Oakedex" for the app owner only.
 */

/** Only this email can use the reserved name "Oakedex". */
const OWNER_EMAIL = 'alexanderbghenriksen@gmail.com';

/** Names only the owner can use. */
const RESERVED_NAMES: string[] = ['oakedex'];

/** Common profanity (lowercase). Used to block display names that are or contain these. */
const PROFANITY_LIST = new Set([
  'ass', 'asses', 'asshole', 'bastard', 'bitch', 'bitches', 'bullshit', 'crap', 'damn', 'dick',
  'dicks', 'fuck', 'fucked', 'fucker', 'fucking', 'fucks', 'hell', 'shit', 'shitty', 'slut',
  'sluts', 'whore', 'whores', 'wtf', 'piss', 'pissed', 'dumbass', 'dipshit', 'cock', 'cocks',
  'pussy', 'pussies', 'dickhead', 'bollocks', 'bloody', 'bugger', 'sod', 'twat', 'wanker',
  'arse', 'arsehole', 'bellend', 'knob', 'tit', 'tits', 'nigger', 'nigga', 'fag', 'faggot',
  'retard', 'retarded', 'rape', 'raping', 'pedo', 'nazi', 'hitler', 'kys',
]);

function normalizeEmail(email: string | null | undefined): string {
  return (email ?? '').toLowerCase().trim();
}

function isOwner(email: string | null | undefined): boolean {
  return normalizeEmail(email) === OWNER_EMAIL.toLowerCase();
}

/**
 * Check if a display name is allowed.
 * - Empty or whitespace-only: not allowed.
 * - Reserved names (e.g. "Oakedex"): only allowed for OWNER_EMAIL.
 * - Profanity: not allowed (exact match or any word in the name).
 */
export function isDisplayNameAllowed(
  name: string,
  userEmail: string | null | undefined
): { allowed: boolean; error?: string } {
  const trimmed = name.trim();
  if (!trimmed) {
    return { allowed: false, error: 'Please enter a name.' };
  }

  const nameLower = trimmed.toLowerCase();
  const words = nameLower.split(/\s+/).filter(Boolean);

  // Reserved names: only owner can use
  for (const reserved of RESERVED_NAMES) {
    if (nameLower === reserved && !isOwner(userEmail)) {
      return { allowed: false, error: 'That name is reserved.' };
    }
  }

  // Exact match profanity
  if (PROFANITY_LIST.has(nameLower)) {
    return { allowed: false, error: 'Please choose a different name.' };
  }

  // Any word in the name is profanity
  for (const word of words) {
    const clean = word.replace(/[^a-z]/g, '');
    if (clean && PROFANITY_LIST.has(clean)) {
      return { allowed: false, error: 'Please choose a different name.' };
    }
  }

  return { allowed: true };
}
