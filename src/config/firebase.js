'use strict';

const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getDatabase }                   = require('firebase-admin/database');
const { getMessaging }                  = require('firebase-admin/messaging');
const path                              = require('path');
require('dotenv').config();

// ─────────────────────────────────────────────────────────────
// Firebase Admin SDK — Singleton Initialization (v14+ API)
//
// Supports two modes:
//   LOCAL  — reads serviceAccountKey.json from disk
//   RENDER — reads FIREBASE_SERVICE_ACCOUNT_JSON env variable
//            (paste the entire JSON content as one env var)
// ─────────────────────────────────────────────────────────────

let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  // ── Render / Production mode ─────────────────────────────
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    console.log('🔑  Loaded service account from environment variable');
  } catch (err) {
    console.error('❌  FIREBASE_SERVICE_ACCOUNT_JSON is set but contains invalid JSON');
    console.error('    Make sure you pasted the full serviceAccountKey.json content');
    process.exit(1);
  }
} else {
  // ── Local development mode ───────────────────────────────
  const serviceAccountPath = path.resolve(
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './serviceAccountKey.json'
  );
  try {
    serviceAccount = require(serviceAccountPath);
    console.log('🔑  Loaded service account from file:', serviceAccountPath);
  } catch (err) {
    console.error('❌  Could not load serviceAccountKey.json');
    console.error('    Expected at:', serviceAccountPath);
    console.error('    Or set FIREBASE_SERVICE_ACCOUNT_JSON environment variable for production');
    process.exit(1);
  }
}

// Only initialize once (safe for nodemon hot reloads)
if (!getApps().length) {
  initializeApp({
    credential : cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
  console.log('✅  Firebase Admin SDK initialized');
}

// Named exports — used by fcmService.js
const db        = getDatabase();
const messaging = getMessaging();

module.exports = { db, messaging };
