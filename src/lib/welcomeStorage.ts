/**
 * Welcome modal: show for new users or when a major app version update has been pushed.
 * Placeholder storage and version check; wire to real app version (e.g. from app.json / native build) later.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const WELCOME_SEEN_KEY = '@oakedex/welcome_seen';
const LAST_WELCOME_VERSION_KEY = '@oakedex/last_welcome_version';

/** Bump this when you want the welcome to show again for all users (e.g. major update). */
export const WELCOME_APP_VERSION = '1.0.0';

export async function getWelcomeSeen(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(WELCOME_SEEN_KEY);
  return raw === 'true';
}

export async function getLastWelcomeVersion(): Promise<string | null> {
  return AsyncStorage.getItem(LAST_WELCOME_VERSION_KEY);
}

/** True if we should show the welcome (new user or app version > last seen welcome version). */
export async function shouldShowWelcome(): Promise<boolean> {
  const [seen, lastVersion] = await Promise.all([
    getWelcomeSeen(),
    getLastWelcomeVersion(),
  ]);
  if (!seen) return true;
  if (lastVersion == null) return true;
  return lastVersion < WELCOME_APP_VERSION;
}

export async function setWelcomeDismissed(): Promise<void> {
  await AsyncStorage.multiSet([
    [WELCOME_SEEN_KEY, 'true'],
    [LAST_WELCOME_VERSION_KEY, WELCOME_APP_VERSION],
  ]);
}
