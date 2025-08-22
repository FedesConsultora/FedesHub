// /backend/src/lib/push/fcm.js
import admin from 'firebase-admin';

let inited = false;

export function initFCM() {
  if (inited) return;
  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;
  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    throw new Error('FCM env vars missing: set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
  }
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
  inited = true;
}

export async function sendToTokens(tokens, notification, data = {}) {
  initFCM();
  if (!tokens?.length) return { successCount: 0, failureCount: 0, responses: [] };
  const res = await admin.messaging().sendEachForMulticast({
    tokens,
    notification, // { title, body }
    data,         // string values only
  });
  return res;
}

export async function checkFCM() {
  initFCM();
  const cred = admin.app().options.credential;
  return { ok: true, projectId: cred.projectId || process.env.FIREBASE_PROJECT_ID };
}
