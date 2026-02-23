#!/usr/bin/env node
/**
 * Push Firebase env vars from local .env to EAS (so EAS Build has config).
 * Run from project root. Requires: .env with EXPO_PUBLIC_FIREBASE_* set, and `eas login`.
 *
 * Usage:
 *   node scripts/set-eas-firebase-env.js
 *   EAS_PROFILE=preview node scripts/set-eas-firebase-env.js
 *
 * Or: npm run eas:set-firebase
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const ENV_PATH = path.join(ROOT, '.env');
const FIREBASE_KEYS = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
];
const OPTIONAL_KEYS = ['EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID'];

function parseEnv(content) {
  const out = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1).replace(/\\"/g, '"').replace(/\\'/g, "'");
    }
    out[key] = value;
  }
  return out;
}

function main() {
  if (!fs.existsSync(ENV_PATH)) {
    console.error('No .env file found. Copy .env.example to .env and fill in your Firebase config.');
    console.error('  Get values from Firebase Console → Project settings → Your apps (Web).');
    process.exit(1);
  }

  const env = parseEnv(fs.readFileSync(ENV_PATH, 'utf8'));
  const missing = FIREBASE_KEYS.filter((k) => !env[k] || String(env[k]).trim() === '');
  if (missing.length) {
    console.error('Missing or empty in .env:', missing.join(', '));
    console.error('Fill these in from Firebase Console → Project settings → Your apps → Web app config.');
    process.exit(1);
  }

  const profile = process.env.EAS_PROFILE || 'production';
  const keysToPush = [
    ...FIREBASE_KEYS,
    ...OPTIONAL_KEYS.filter((k) => env[k] && String(env[k]).trim()),
  ];
  console.log(`Pushing env vars to EAS environment: ${profile}`);
  console.log('(Set EAS_PROFILE=preview or production-apk to use another profile.)\n');

  for (const key of keysToPush) {
    const value = env[key];
    const args = [
      'eas',
      'env:create',
      '--environment', profile,
      '--name', key,
      '--value', value,
      '--type', 'string',
      '--visibility', 'plaintext',
      '--non-interactive',
    ];
    console.log(`  Creating ${key}...`);
    const r = spawnSync('npx', args, {
      cwd: ROOT,
      stdio: 'inherit',
      shell: true,
    });
    if (r.status !== 0) {
      console.error(`Failed for ${key}. If it already exists, update it in the EAS dashboard or delete it and re-run.`);
      process.exit(1);
    }
  }

  console.log('\nDone. Run a new EAS build so the app gets these variables:');
  console.log('  npx eas build --platform android --profile', profile);
}

main();
