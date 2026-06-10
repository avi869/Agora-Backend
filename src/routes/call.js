'use strict';

const express                   = require('express');
const { getReceiverToken,
        sendFCMMessage,
        writeCallRequest,
        updateCallStatus }      = require('../services/fcmService');

const router = express.Router();

// ─────────────────────────────────────────────────────────────
// POST /call  — Initiate a call
//
// Body (JSON):
// {
//   "callerId"  : 123,
//   "receiverId": 4321,
//   "channelId" : "room",
//   "callType"  : "VIDEO"   // "VIDEO" | "AUDIO"
// }
//
// Flow:
//  1. Validate request body
//  2. Write call_requests/{channelId} to Firebase DB  (status: ringing)
//  3. Look up receiver's FCM token from Firebase DB
//  4. Send data-only FCM push to receiver's device
//  5. Return success / error response
// ─────────────────────────────────────────────────────────────

router.post('/', async (req, res) => {
  const { callerId, receiverId, channelId, callType } = req.body;

  // ── 1. Input Validation ──────────────────────────────────────
  if (!callerId || !receiverId || !channelId || !callType) {
    return res.status(400).json({
      success: false,
      error  : 'Missing required fields: callerId, receiverId, channelId, callType',
    });
  }

  const allowedCallTypes = ['VIDEO', 'AUDIO'];
  if (!allowedCallTypes.includes(String(callType).toUpperCase())) {
    return res.status(400).json({
      success: false,
      error  : `Invalid callType. Must be one of: ${allowedCallTypes.join(', ')}`,
    });
  }

  console.log(`\n📞  CALL  ${callerId} → ${receiverId} | channel: ${channelId} | type: ${callType}`);

  try {
    // ── 2. Write call_requests to Firebase DB ────────────────────
    console.log(`📝  Writing call_requests/${channelId} → Firebase DB`);
    await writeCallRequest({ channelId, callerId, receiverId, callType });
    console.log(`✅  call_requests/${channelId} written  (status: ringing)`);

    // ── 3. Get Receiver FCM Token ────────────────────────────────
    console.log(`🔍  Looking up FCM token for receiver: ${receiverId}`);
    const fcmToken = await getReceiverToken(receiverId);
    console.log(`✅  FCM token found: ${fcmToken.substring(0, 12)}...`);

    // ── 4. Send FCM Push ─────────────────────────────────────────
    console.log(`📤  Sending FCM → receiver: ${receiverId}`);
    const messageId = await sendFCMMessage(fcmToken, {
      type      : 'incoming_call',
      callerId  : String(callerId),
      channelId : String(channelId),
      callType  : String(callType).toUpperCase(),
    });
    console.log(`✅  FCM sent — messageId: ${messageId}`);

    // ── 5. Success Response ──────────────────────────────────────
    return res.status(200).json({
      success  : true,
      message  : 'Call notification sent successfully',
      messageId,
    });

  } catch (err) {
    console.error(`❌  POST /call error:`, err.message);

    if (err.message.includes('FCM token not found') ||
        err.message.includes('Invalid FCM token')) {
      return res.status(404).json({ success: false, error: err.message });
    }

    return res.status(500).json({
      success: false,
      error  : 'Internal server error. Could not send call notification.',
    });
  }
});

// ─────────────────────────────────────────────────────────────
// PATCH /call/:channelId/status  — Update call status
//
// Used by Android when receiver accepts / rejects / call ends.
//
// Body: { "status": "accepted" | "rejected" | "ended" }
// ─────────────────────────────────────────────────────────────

router.patch('/:channelId/status', async (req, res) => {
  const { channelId } = req.params;
  const { status }    = req.body;

  const allowedStatuses = ['accepted', 'rejected', 'ended', 'ringing'];
  if (!status || !allowedStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      error  : `Invalid status. Must be one of: ${allowedStatuses.join(', ')}`,
    });
  }

  console.log(`\n🔄  STATUS UPDATE  channel: ${channelId} → ${status}`);

  try {
    await updateCallStatus(channelId, status);
    console.log(`✅  call_requests/${channelId}/status → ${status}`);

    return res.status(200).json({
      success  : true,
      channelId,
      status,
    });
  } catch (err) {
    console.error(`❌  PATCH /call status error:`, err.message);

    if (err.message.includes('not found')) {
      return res.status(404).json({ success: false, error: err.message });
    }

    return res.status(500).json({ success: false, error: 'Could not update call status.' });
  }
});

module.exports = router;
