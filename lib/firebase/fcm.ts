/**
 * lib/firebase/fcm.ts
 *
 * Server-side FCM helper using the Admin SDK.
 *
 * Usage pattern:
 *   await sendToUser(uid, { title: "Budget Alert", body: "You've hit 80% of your Food budget." });
 *
 * Token management:
 *   FCM tokens are stored in users/{uid}/fcmTokens/{tokenId}.
 *   If a send fails with a "registration-token-not-registered" error, the
 *   stale token is automatically removed from Firestore.
 *
 * Security note: FCM tokens are NOT returned via any API — they are
 * write-only from the client perspective (register-token endpoint) and
 * read-only from the server perspective (this helper).
 */

import { getAdminApp } from "@/lib/firebase/admin";
import { getMessaging, MulticastMessage } from "firebase-admin/messaging";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

export interface NotificationPayload {
  title: string;
  body:  string;
  data?: Record<string, string>;
}

/**
 * Sends a notification to all registered FCM tokens for a user.
 * Stale/unregistered tokens are cleaned up automatically.
 *
 * Returns the number of successful sends.
 */
export async function sendToUser(
  uid:     string,
  payload: NotificationPayload
): Promise<number> {
  const db   = getFirestore();
  const snap = await db.collection(`users/${uid}/fcmTokens`).get();

  if (snap.empty) return 0;

  const tokens = snap.docs.map((d) => d.data().token as string).filter(Boolean);
  if (tokens.length === 0) return 0;

  const messaging = getMessaging(getAdminApp());

  const message: MulticastMessage = {
    tokens,
    notification: {
      title: payload.title,
      body:  payload.body,
    },
    data: payload.data ?? {},
    // Web push config — works for PWA notifications
    webpush: {
      notification: {
        title: payload.title,
        body:  payload.body,
        icon:  "/icons/icon-192.png",
      },
    },
  };

  const response = await messaging.sendEachForMulticast(message);

  // Clean up stale tokens
  const staleTokenIds: string[] = [];
  response.responses.forEach((res, idx) => {
    if (
      !res.success &&
      (res.error?.code === "messaging/registration-token-not-registered" ||
       res.error?.code === "messaging/invalid-registration-token")
    ) {
      staleTokenIds.push(snap.docs[idx]!.id);
    }
  });

  if (staleTokenIds.length > 0) {
    const batch = db.batch();
    for (const id of staleTokenIds) {
      batch.delete(db.doc(`users/${uid}/fcmTokens/${id}`));
    }
    await batch.commit();
  }

  return response.successCount;
}
