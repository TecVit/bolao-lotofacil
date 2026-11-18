"use client";
import { getApps, initializeApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseAtivo = !!config.projectId && !!config.apiKey;

let db: Firestore | null = null;
export function clientDb(): Firestore | null {
  if (!firebaseAtivo) return null;
  if (db) return db;
  const app = getApps()[0] ?? initializeApp(config);
  return (db = getFirestore(app));
}
