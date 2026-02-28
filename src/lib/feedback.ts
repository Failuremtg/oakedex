/**
 * Submit and manage user feedback in Firestore. Collection "feedback".
 * Admins can list, delete, and export feedback.
 */

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { getFirebaseFirestore } from '@/src/lib/firebase';

export interface FeedbackEntry {
  id: string;
  message: string;
  userId: string;
  userEmail: string | null;
  createdAt: Date | null;
}

export async function submitFeedback(params: {
  message: string;
  userId: string;
  userEmail: string | null;
}): Promise<void> {
  const db = getFirebaseFirestore();
  if (!db) throw new Error('Firebase is not configured.');
  const col = collection(db, 'feedback');
  await addDoc(col, {
    message: params.message.trim(),
    userId: params.userId,
    userEmail: params.userEmail ?? null,
    createdAt: serverTimestamp(),
  });
}

/** List all feedback (admin only; Firestore rules enforce). Newest first. */
export async function listFeedback(): Promise<FeedbackEntry[]> {
  const db = getFirebaseFirestore();
  if (!db) throw new Error('Firebase is not configured.');
  const snapshot = await getDocs(collection(db, 'feedback'));
  const out: FeedbackEntry[] = [];
  snapshot.forEach((d) => {
    const data = d.data();
    const createdAt = data.createdAt instanceof Timestamp
      ? data.createdAt.toDate()
      : data.createdAt?.seconds != null
        ? new Date(data.createdAt.seconds * 1000)
        : null;
    out.push({
      id: d.id,
      message: typeof data.message === 'string' ? data.message : '',
      userId: typeof data.userId === 'string' ? data.userId : '',
      userEmail: data.userEmail != null ? String(data.userEmail) : null,
      createdAt,
    });
  });
  out.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  return out;
}

/** Delete one feedback document (admin only). */
export async function deleteFeedback(id: string): Promise<void> {
  const db = getFirebaseFirestore();
  if (!db) throw new Error('Firebase is not configured.');
  await deleteDoc(doc(db, 'feedback', id));
}

/** Format all entries as a single text string for export. */
export function formatFeedbackAsText(entries: FeedbackEntry[]): string {
  const lines: string[] = ['Oakedex feedback export', '====================', ''];
  entries.forEach((e, i) => {
    const date = e.createdAt ? e.createdAt.toISOString() : '(no date)';
    lines.push(`--- Feedback ${i + 1} (${date}) ---`);
    lines.push(`From: ${e.userEmail ?? e.userId ?? 'unknown'}`);
    lines.push(`UserId: ${e.userId}`);
    lines.push('');
    lines.push(e.message);
    lines.push('');
  });
  return lines.join('\n');
}
