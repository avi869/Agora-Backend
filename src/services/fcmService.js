'use strict';

const { db, messaging } = require('../config/firebase');

// ─────────────────────────────────────────────────────────────
// FCM Service
// ─────────────────────────────────────────────────────────────

/**
 * Reads the FCM token of a user from Firebase Realtime Database.
 * Database path:  users/{userId}/fcmToken
 *
 * @param {string|number} userId
 * @returns {Promise<string>} FCM token
 */
async function getReceiverToken(userId) {
  const snapshot = await db.ref(`users/${userId}/fcmToken`).once('value');

  if (!snapshot.exists()) {
    throw new Error(`FCM token not found for user: ${userId}`);
  }

  const token = snapshot.val();
  if (!token || typeof token !== 'string') {
    throw new Error(`Invalid FCM token for user: ${userId}`);
  }

  return token;
}

/**
 * Sends a data-only FCM message to a specific device token.
 * Data-only (no notification block) — Android handles UI in
 * FirebaseMessagingService.onMessageReceived().
 *
 * @param {string} fcmToken
 * @param {object} data  — key/value pairs (all values stringified)
 * @returns {Promise<string>} FCM message ID
 */
async function sendFCMMessage(fcmToken, data) {
  const stringifiedData = Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, String(v)])
  );

  const message = {
    token  : fcmToken,
    data   : stringifiedData,
    android: { priority: 'high' },  // deliver even in Doze mode
  };

  return messaging.send(message);
}

// ─────────────────────────────────────────────────────────────
// Firebase Realtime Database — call_requests helpers
// ─────────────────────────────────────────────────────────────

/**
 * Creates or overwrites a call_request record in Firebase.
 * Path: call_requests/{channelId}
 *
 * @param {object} params
 * @param {string|number} params.channelId
 * @param {string|number} params.callerId
 * @param {string|number} params.receiverId
 * @param {string}        params.callType
 * @param {string}        [params.status]  default: 'ringing'
 */
async function writeCallRequest({ channelId, callerId, receiverId, callType, status = 'ringing' }) {
  await db.ref(`call_requests/${channelId}`).set({
    callerId  : Number(callerId),
    receiverId: Number(receiverId),
    callType  : String(callType).toUpperCase(),
    status,
    createdAt : Date.now(),
  });
}

/**
 * Updates the status of an existing call_request.
 * Path: call_requests/{channelId}/status
 *
 * @param {string|number} channelId
 * @param {'ringing'|'accepted'|'rejected'|'ended'} status
 */
async function updateCallStatus(channelId, status) {
  const ref = db.ref(`call_requests/${channelId}`);
  const snapshot = await ref.once('value');

  if (!snapshot.exists()) {
    throw new Error(`Call request not found for channelId: ${channelId}`);
  }

  await ref.update({ status, updatedAt: Date.now() });
}

module.exports = {
  getReceiverToken,
  sendFCMMessage,
  writeCallRequest,
  updateCallStatus,
};
