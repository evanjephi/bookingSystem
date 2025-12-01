import admin from 'firebase-admin';

let firestore: admin.firestore.Firestore | null = null;

export function getFirestore() {
  if (firestore) return firestore;

  const svc = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!svc) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT not set. Create a service account JSON and set this env var.');
  }

  let serviceAccount: any;
  try {
    serviceAccount = JSON.parse(svc);
  } catch (err) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is not valid JSON');
  }


  if (serviceAccount && typeof serviceAccount.private_key === 'string') {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  firestore = admin.firestore();
  return firestore;
}
