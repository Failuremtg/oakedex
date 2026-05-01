import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@oakedex/onboardingSeen';

export async function shouldShowOnboarding(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(KEY);
    return v !== '1';
  } catch {
    return true;
  }
}

export async function setOnboardingSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, '1');
  } catch {
    // ignore
  }
}

