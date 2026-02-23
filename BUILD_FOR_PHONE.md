# Build for testing on your phone

## Firebase config (fix “Add Firebase config” on phone)

The app on your **phone build** does not use your local `.env` file. To enable sign-in and Firebase on the installed APK, set the same variables in **EAS**:

1. Open [expo.dev](https://expo.dev) → your project **Oakedex** → **Secrets** (or **Environment variables**).
2. Add these variables for the **preview** (or **production**) environment. Use the same values as in your local `.env`:

   - `EXPO_PUBLIC_FIREBASE_API_KEY`
   - `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
   - `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `EXPO_PUBLIC_FIREBASE_APP_ID`

3. Create each as **plaintext** (not secret) so they are embedded in the app build.
4. **Rebuild** the app: `eas build --profile preview --platform android`. The new APK will include Firebase and sign-in will work.

You can also set them from the terminal (one per variable):

```bash
eas env:create --name EXPO_PUBLIC_FIREBASE_API_KEY --value "your-api-key" --visibility plaintext --environment preview
```

Repeat for each variable, then run the build again.

---

## Android (APK – install on your phone)

1. **Install EAS CLI** (if needed):
   ```bash
   npm install -g eas-cli
   ```

2. **Log in to Expo**:
   ```bash
   eas login
   ```

3. **From the project folder**, run:
   ```bash
   cd path/to/oakedex
   eas build --profile preview --platform android
   ```

4. EAS will build in the cloud. When it finishes you’ll get a **link to download the APK**. Open that link on your Android phone (or download on computer and transfer the APK), then install it.

- **Preview** = internal testing, builds an **APK** (no app store).
- Your Firebase/Env vars: if you use EAS Secrets for keys, set them in the Expo dashboard or with `eas env:create`. For a quick test, `.env` is not used on EAS by default; use **EAS Environment Variables** in the project dashboard (Project → Secrets) or `eas env:create` so the build has the right config.

## iOS

To test on iPhone you need an Apple Developer account. Then:

```bash
eas build --profile preview --platform ios
```

You’ll need to register the device and use the link EAS provides to install the app.

---

**Quick one-liner for Android APK:**

```bash
eas build --profile preview --platform android
```

After the build completes, use the provided link to download and install the APK on your phone.
