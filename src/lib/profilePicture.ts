/**
 * Profile picture preference: either a trainer sprite ID or a custom image URI (saved locally).
 */

import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

const KEY = '@oakedex/profilePicture';
const PROFILE_PHOTO_FILENAME = 'profilePhoto.jpg';

export type ProfilePicturePref =
  | { type: 'sprite'; id: string }
  | { type: 'custom'; uri: string };

export async function getProfilePicturePref(): Promise<ProfilePicturePref | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ProfilePicturePref;
    if (parsed?.type === 'sprite' && typeof parsed.id === 'string') return parsed;
    if (parsed?.type === 'custom' && typeof parsed.uri === 'string') return parsed;
    return null;
  } catch {
    return null;
  }
}

export async function setProfilePicturePref(pref: ProfilePicturePref): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(pref));
}

/** Pick image from library, copy to app doc dir, save pref. Returns new URI or null. */
export async function pickAndSaveCustomPhoto(): Promise<string | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') return null;
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.9,
  });
  if (result.canceled || !result.assets?.[0]?.uri) return null;
  const dest = `${FileSystem.documentDirectory}${PROFILE_PHOTO_FILENAME}`;
  await FileSystem.copyAsync({ from: result.assets[0].uri, to: dest });
  await setProfilePicturePref({ type: 'custom', uri: dest });
  return dest;
}
