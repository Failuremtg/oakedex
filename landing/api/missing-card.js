/**
 * Vercel serverless: POST /api/missing-card
 * Accepts { cardName, setName?, notes?, email?, imageBase64, imageFileName }
 * Uploads image to Firebase Storage (missingCardSubmissions/{id}/file), saves submission to Firestore.
 * Uses same env: FIREBASE_SERVICE_ACCOUNT_JSON.
 */

let admin;
try {
  admin = require('firebase-admin');
} catch (e) {
  console.error('firebase-admin not installed');
}

function getApp() {
  if (!admin) return null;
  if (admin.apps && admin.apps.length > 0) {
    return admin.app();
  }
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) {
    console.error('FIREBASE_SERVICE_ACCOUNT_JSON not set');
    return null;
  }
  try {
    const cred = JSON.parse(json);
    return admin.initializeApp({ credential: admin.credential.cert(cred) });
  } catch (e) {
    console.error('Invalid FIREBASE_SERVICE_ACCOUNT_JSON', e.message);
    return null;
  }
}

const STORAGE_PREFIX = 'missingCardSubmissions/';
const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4MB
const ALLOWED_TYPES = /^image\/(jpeg|png|webp|gif)$/;
const EXT_MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };

function safeFileName(name) {
  return (name || 'image').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80) || 'image';
}

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

  const cardName = typeof body.cardName === 'string' ? body.cardName.trim() : '';
  if (!cardName) {
    res.status(400).json({ error: 'Card name is required' });
    return;
  }
  if (cardName.length > 200) {
    res.status(400).json({ error: 'Card name must be at most 200 characters' });
    return;
  }

  const setName = typeof body.setName === 'string' ? body.setName.trim().slice(0, 200) : null;
  const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 2000) : null;
  const email = typeof body.email === 'string' ? body.email.trim() : null;
  const submitterEmail = email && email.length > 0 ? email : null;

  const imageBase64 = body.imageBase64;
  const imageFileName = typeof body.imageFileName === 'string' ? body.imageFileName : '';
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    res.status(400).json({ error: 'Image is required. Please upload a photo of the card.' });
    return;
  }

  let buffer;
  try {
    buffer = Buffer.from(imageBase64, 'base64');
  } catch {
    res.status(400).json({ error: 'Invalid image data' });
    return;
  }
  if (buffer.length > MAX_IMAGE_BYTES) {
    res.status(400).json({ error: 'Image must be 4 MB or smaller. Please use a smaller or compressed image.' });
    return;
  }
  if (buffer.length < 100) {
    res.status(400).json({ error: 'Image file is too small or invalid' });
    return;
  }

  const ext = (imageFileName.split('.').pop() || '').toLowerCase() || 'jpg';
  const contentType = EXT_MIME[ext] || 'image/jpeg';

  const app = getApp();
  if (!app) {
    res.status(503).json({ error: 'Service is not configured. Please try again later.' });
    return;
  }

  const db = admin.firestore();
  const bucket = admin.storage().bucket();

  const id = db.collection('_').doc().id;
  const safeName = safeFileName(imageFileName) || 'image.jpg';
  const storagePath = STORAGE_PREFIX + id + '/' + safeName;

  try {
    const file = bucket.file(storagePath);
    await file.save(buffer, {
      metadata: { contentType },
    });
    const publicUrl = 'https://firebasestorage.googleapis.com/v0/b/' + bucket.name + '/o/' + encodeURIComponent(storagePath) + '?alt=media';

    await db.collection('missingCardSubmissions').doc(id).set({
      cardName,
      setName: setName || null,
      notes: notes || null,
      submitterEmail: submitterEmail || null,
      imageUrl: publicUrl,
      imageFileName: imageFileName || safeName,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      source: 'web',
    });

    res.status(200).json({ success: true });
  } catch (e) {
    console.error('Missing card submission error', e);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
};
