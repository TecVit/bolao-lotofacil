import "server-only";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let db: Firestore | null | undefined;

/** Retorna o Firestore (Admin) ou null se FIREBASE_SERVICE_ACCOUNT não estiver configurado. */
export function adminDb(): Firestore | null {
  if (db !== undefined) return db;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return (db = null);
  const sa = JSON.parse(raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8"));
  const app = getApps()[0] ?? initializeApp({ credential: cert(sa) });
  db = getFirestore(app);
  try { db.settings({ ignoreUndefinedProperties: true }); } catch { /* já configurado */ }
  return db;
}
