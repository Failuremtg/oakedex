#!/usr/bin/env node
/**
 * Copy Firebase Web config into landing/firebase-config.js so the
 * landing form writes to Firestore. Uses .env if present; otherwise
 * uses project_id from your service account key (.env.export) and
 * prompts you to add the rest from Firebase Console.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const envPath = path.join(root, '.env');
const envExportPath = path.join(root, '.env.export');
const outPath = path.join(root, 'landing', 'firebase-config.js');

let vars = { API_KEY: '', AUTH_DOMAIN: '', PROJECT_ID: '', STORAGE_BUCKET: '', MESSAGING_SENDER_ID: '', APP_ID: '' };

if (fs.existsSync(envPath)) {
  const env = fs.readFileSync(envPath, 'utf8');
  env.split('\n').forEach((line) => {
    const m = line.match(/^\s*EXPO_PUBLIC_FIREBASE_(API_KEY|AUTH_DOMAIN|PROJECT_ID|STORAGE_BUCKET|MESSAGING_SENDER_ID|APP_ID)\s*=\s*(.*)$/);
    if (m) vars[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
  });
}

if (!vars.PROJECT_ID && fs.existsSync(envExportPath)) {
  const exportContent = fs.readFileSync(envExportPath, 'utf8');
  let keyPath = '';
  exportContent.split('\n').forEach((line) => {
    const m = line.match(/^\s*GOOGLE_APPLICATION_CREDENTIALS\s*=\s*(.+)\s*$/);
    if (m) keyPath = m[1].replace(/^["']|["']$/g, '').trim();
  });
  if (keyPath && fs.existsSync(keyPath)) {
    try {
      const key = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
      if (key.project_id) vars.PROJECT_ID = key.project_id;
    } catch (e) { /* ignore */ }
  }
}

const projectId = vars.PROJECT_ID;
if (!projectId) {
  console.error('');
  console.error('Firebase Web config not found. Do one of the following:');
  console.error('');
  console.error('  Option A – Use .env (recommended)');
  console.error('    1. Copy .env.example to .env');
  console.error('    2. In Firebase Console go to: Project settings → Your apps → Web app');
  console.error('    3. Copy the config (apiKey, authDomain, projectId, etc.) into .env as EXPO_PUBLIC_FIREBASE_API_KEY=..., etc.');
  console.error('    4. Run: npm run landing:firebase-config');
  console.error('');
  console.error('  Option B – Edit landing/firebase-config.js by hand');
  console.error('    Open landing/firebase-config.js and paste the same Web app config from Firebase Console.');
  console.error('');
  process.exit(1);
}

const config = `/**
 * Firebase config for landing signups (filled by scripts/fill-landing-firebase-config.js).
 */
window.FIREBASE_CONFIG = {
  apiKey: ${JSON.stringify(vars.API_KEY || '')},
  authDomain: ${JSON.stringify(vars.AUTH_DOMAIN || '')},
  projectId: ${JSON.stringify(projectId)},
  storageBucket: ${JSON.stringify(vars.STORAGE_BUCKET || '')},
  messagingSenderId: ${JSON.stringify(vars.MESSAGING_SENDER_ID || '')},
  appId: ${JSON.stringify(vars.APP_ID || '')}
};
`;

fs.writeFileSync(outPath, config, 'utf8');

if (vars.API_KEY && vars.APP_ID) {
  console.log('Updated landing/firebase-config.js. Landing signups will now go to Firestore.');
} else {
  console.log('Updated landing/firebase-config.js with projectId:', projectId);
  console.log('');
  console.log('Still need Web config (apiKey, authDomain, appId, etc.):');
  console.log('  1. Firebase Console → Project settings → Your apps → Web app');
  console.log('  2. Copy the config values into landing/firebase-config.js (or into .env as EXPO_PUBLIC_FIREBASE_* and run this script again).');
}
