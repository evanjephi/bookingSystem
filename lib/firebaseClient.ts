// lib/firebaseClient.ts
'use client';

import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { doc, getFirestore, onSnapshot, type Firestore, type DocumentData, type DocumentSnapshot } from 'firebase/firestore';

import { format } from 'date-fns';

type AvailabilitySlot = { start: string; end: string };

function resolveFirebaseApp(): FirebaseApp {
  if (!getApps().length) {
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };

    if (!firebaseConfig.projectId) {
      throw new Error('Missing Firebase config. Set NEXT_PUBLIC_FIREBASE_* env vars.');
    }

    initializeApp(firebaseConfig);
  }

  return getApp();
}

function resolveDb(): Firestore {
  return getFirestore(resolveFirebaseApp());
}

export function subscribeToWorkerAvailability(
  workerId: string,
  date: Date,
  callback: (slots: AvailabilitySlot[]) => void
) {
  const db = resolveDb();
  const dateStr = format(date, 'yyyy-MM-dd');
  const availabilityRef = doc(db, 'psw_workers', workerId, 'availability', dateStr);

  return onSnapshot(availabilityRef, (snapshot: DocumentSnapshot<DocumentData>) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }

    const data = snapshot.data() as DocumentData | undefined;
    const slots = (data?.availableSlots as AvailabilitySlot[]) || [];
    callback(slots);
  });
}