#!/usr/bin/env node
/**
 * Export all landing signups from Firestore to CSV.
 *
 * Prerequisites:
 *   1. Firebase Admin: npm install firebase-admin (or add as devDependency).
 *   2. Service account: Create .env.export in project root with:
 *      GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\your-service-account.json
 *
 * Run:
 *   npm run export-signups
 *   npm run export-signups -- --output landing-signups.csv
 */

const fs = require('fs');
const path = require('path');

// Load .env.export from project root (gitignored) so key path is not committed
const envExportPath = path.resolve(__dirname, '..', '.env.export');
if (fs.existsSync(envExportPath)) {
  const content = fs.readFileSync(envExportPath, 'utf8');
  content.split('\n').forEach((line) => {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)\s*$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
  });
}

let admin;
try {
  admin = require('firebase-admin');
} catch (e) {
  console.error('Run: npm install firebase-admin');
  process.exit(1);
}

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;
if (!admin.apps.length) {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp({ projectId: projectId || undefined });
  } else if (projectId) {
    admin.initializeApp({ projectId });
  } else {
    console.error('Set GOOGLE_APPLICATION_CREDENTIALS to your service account JSON path, or FIREBASE_PROJECT_ID');
    process.exit(1);
  }
}

const db = admin.firestore();

function escapeCsv(val) {
  const s = String(val == null ? '' : val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

async function main() {
  const outArg = process.argv.indexOf('--output');
  const outputPath = outArg >= 0 ? process.argv[outArg + 1] : null;

  const snap = await db.collection('landingSignups').orderBy('createdAt', 'asc').get();
  const rows = [];
  snap.docs.forEach((doc) => {
    const d = doc.data();
    rows.push({
      email: d.email || '',
      beta: d.beta ? 'yes' : 'no',
      source: d.source || '',
      createdAt: d.createdAt && d.createdAt.toDate ? d.createdAt.toDate().toISOString() : ''
    });
  });

  const header = 'email,beta,source,createdAt';
  const lines = [header].concat(rows.map((r) => [r.email, r.beta, r.source, r.createdAt].map(escapeCsv).join(',')));
  const csv = lines.join('\n');

  if (outputPath) {
    fs.writeFileSync(path.resolve(process.cwd(), outputPath), csv, 'utf8');
    console.log('Wrote %d signups to %s', rows.length, outputPath);
  } else {
    console.log(csv);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
