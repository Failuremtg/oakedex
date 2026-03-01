/**
 * Vercel serverless: POST /api/feedback
 * Accepts { message, type?: 'bug'|'feedback'|'other', email?: string }
 * Writes to Firestore "feedback" collection so reports show in app Admin → Feedback.
 * Set env: FIREBASE_SERVICE_ACCOUNT_JSON = full JSON string of your Firebase service account key.
 */

let admin;
try {
  admin = require('firebase-admin');
} catch (e) {
  console.error('firebase-admin not installed');
}

function getFirestore() {
  if (!admin) return null;
  if (admin.apps && admin.apps.length > 0) {
    return admin.firestore();
  }
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) {
    console.error('FIREBASE_SERVICE_ACCOUNT_JSON not set');
    return null;
  }
  try {
    const cred = JSON.parse(json);
    admin.initializeApp({ credential: admin.credential.cert(cred) });
    return admin.firestore();
  } catch (e) {
    console.error('Invalid FIREBASE_SERVICE_ACCOUNT_JSON', e.message);
    return null;
  }
}

const MAX_MESSAGE_LENGTH = 5000;
const ALLOWED_TYPES = ['bug', 'feedback', 'other'];

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  } catch {
    res.status(400).json({ error: 'Invalid JSON body' });
    return;
  }

  const rawMessage = typeof body.message === 'string' ? body.message.trim() : '';
  if (!rawMessage) {
    res.status(400).json({ error: 'Message is required' });
    return;
  }
  if (rawMessage.length > MAX_MESSAGE_LENGTH) {
    res.status(400).json({ error: `Message must be at most ${MAX_MESSAGE_LENGTH} characters` });
    return;
  }

  const type = ALLOWED_TYPES.includes(body.type) ? body.type : 'feedback';
  const email = typeof body.email === 'string' ? body.email.trim() : null;
  const emailToStore = email && email.length > 0 ? email : null;

  const db = getFirestore();
  if (!db) {
    res.status(503).json({ error: 'Feedback service is not configured. Please try again later.' });
    return;
  }

  try {
    const prefixedMessage = type === 'bug'
      ? '[Bug report]\n\n' + rawMessage
      : type === 'other'
        ? '[Other]\n\n' + rawMessage
        : rawMessage;

    await db.collection('feedback').add({
      message: prefixedMessage,
      userId: 'web',
      userEmail: emailToStore,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      source: 'web',
      type,
    });

    res.status(200).json({ success: true });
  } catch (e) {
    console.error('Feedback write error', e);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
};
