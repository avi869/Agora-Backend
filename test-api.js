/**
 * test-api.js  —  Manual end-to-end test script
 *
 * Run with:  node test-api.js
 *
 * Tests all backend endpoints without needing Android / Postman.
 * Make sure the server is running first:  npm run dev
 */

'use strict';

const BASE_URL = 'http://localhost:3000';

// ── Helper ────────────────────────────────────────────────────
async function request(method, path, body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) options.body = JSON.stringify(body);

  const res  = await fetch(`${BASE_URL}${path}`, options);
  const json = await res.json();

  const icon = res.ok ? '✅' : '❌';
  console.log(`\n${icon}  ${method} ${path}  →  HTTP ${res.status}`);
  console.log('   Response:', JSON.stringify(json, null, 2));
  return { status: res.status, body: json };
}

// ── Tests ─────────────────────────────────────────────────────
async function runTests() {
  console.log('═'.repeat(55));
  console.log('  Agora Backend — API Tests');
  console.log('═'.repeat(55));

  // 1. Health check
  console.log('\n──── Test 1: Health Check ────');
  await request('GET', '/health');

  // 2. POST /call — missing fields
  console.log('\n──── Test 2: POST /call — missing fields ────');
  await request('POST', '/call', {
    callerId : 123,
    channelId: 'room_abc',
    callType : 'VIDEO',
    // receiverId intentionally missing
  });

  // 3. POST /call — invalid callType
  console.log('\n──── Test 3: POST /call — invalid callType ────');
  await request('POST', '/call', {
    callerId  : 123,
    receiverId: 4321,
    channelId : 'room_abc',
    callType  : 'HOLOGRAM',
  });

  // 4. POST /call — valid (requires real Firebase data)
  console.log('\n──── Test 4: POST /call — full flow ────');
  console.log('   (needs real receiverId with fcmToken in Firebase DB)');
  await request('POST', '/call', {
    callerId  : 123,
    receiverId: 4321,    // ← change to a real user ID in your Firebase DB
    channelId : 'room_abc',
    callType  : 'VIDEO',
  });

  // 5. PATCH /call/:channelId/status — accepted
  console.log('\n──── Test 5: PATCH /call/room_abc/status → accepted ────');
  await request('PATCH', '/call/room_abc/status', { status: 'accepted' });

  // 6. PATCH /call/:channelId/status — ended
  console.log('\n──── Test 6: PATCH /call/room_abc/status → ended ────');
  await request('PATCH', '/call/room_abc/status', { status: 'ended' });

  // 7. PATCH — invalid status
  console.log('\n──── Test 7: PATCH — invalid status ────');
  await request('PATCH', '/call/room_abc/status', { status: 'FLYING' });

  // 8. 404 for unknown route
  console.log('\n──── Test 8: Unknown route ────');
  await request('GET', '/unknown-route');

  console.log('\n' + '═'.repeat(55));
  console.log('  Tests complete!');
  console.log('═'.repeat(55) + '\n');
}

runTests().catch(err => {
  console.error('Test runner error:', err.message);
  process.exit(1);
});
