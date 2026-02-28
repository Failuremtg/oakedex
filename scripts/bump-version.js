/**
 * Bumps app version (patch) and Android versionCode / iOS buildNumber for the next build.
 * Run before each AAB build so every production build has a unique version.
 * Usage: node scripts/bump-version.js
 */
const path = require('path');
const fs = require('fs');

const appJsonPath = path.join(__dirname, '..', 'app.json');
const app = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

const version = app.expo.version || '0.5.0';
const parts = version.split('.').map((n) => parseInt(n, 10));
if (parts.length < 3) {
  parts[0] = parts[0] ?? 0;
  parts[1] = parts[1] ?? 5;
  parts[2] = 0;
}
parts[2] = (parts[2] || 0) + 1;
const newVersion = parts.join('.');

const versionCode = (app.expo.android && app.expo.android.versionCode) || 1;
const newVersionCode = versionCode + 1;

let newBuildNumber = '1';
if (app.expo.ios && app.expo.ios.buildNumber) {
  const n = parseInt(app.expo.ios.buildNumber, 10);
  newBuildNumber = String(Number.isNaN(n) ? 1 : n + 1);
}

app.expo.version = newVersion;
if (!app.expo.android) app.expo.android = {};
app.expo.android.versionCode = newVersionCode;
if (!app.expo.ios) app.expo.ios = {};
app.expo.ios.buildNumber = newBuildNumber;

fs.writeFileSync(appJsonPath, JSON.stringify(app, null, 2) + '\n', 'utf8');

console.log(`Version bumped: ${version} → ${newVersion} (versionCode ${versionCode} → ${newVersionCode}, iOS build ${newBuildNumber})`);
