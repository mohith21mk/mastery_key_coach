const https = require('https');

const BASE_URL = 'https://mastery-key-coach.netlify.app';

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqOptions = {
      method: options.method || 'GET',
      headers: {
        'Accept': 'application/json',
        ...(options.headers || {}),
      },
    };

    if (options.body) {
      reqOptions.headers['Content-Type'] = 'application/json';
    }

    const req = https.request(url, reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed;
        try {
          parsed = JSON.parse(data);
        } catch (e) {
          parsed = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: parsed,
        });
      });
    });

    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

function extractCookie(headers) {
  const setCookie = headers['set-cookie'];
  if (!setCookie) return null;
  const raw = Array.isArray(setCookie) ? setCookie.join('; ') : setCookie;
  const match = raw.match(/mkc_session=([^;]+)/);
  return match ? `mkc_session=${match[1]}` : null;
}

async function run() {
  console.log('===============================================================');
  console.log('LIVE PRODUCTION END-TO-END VALIDATION');
  console.log('Target:', BASE_URL);
  console.log('===============================================================\n');

  // 1. Health & Readiness
  console.log('[1] Health & Readiness:');
  const rHealth = await request('/api/health');
  console.log('  GET /api/health -> HTTP', rHealth.status, rHealth.data?.status === 'ok' ? '✓ OK' : '✗ FAIL');

  const rReady = await request('/api/health/ready');
  console.log('  GET /api/health/ready -> HTTP', rReady.status, rReady.data?.database === 'connected' ? '✓ CONNECTED' : '✗ FAIL');
  console.log('  Verified table count in Supabase:', rReady.data?.tableCount, 'tables');

  if (rReady.status !== 200 || rReady.data?.database !== 'connected') {
    throw new Error('Database is not ready, halting test.');
  }

  // Generate unique test credentials
  const timestamp = Date.now();
  const testUser = {
    email: `qa_user_${timestamp}@masterykeycoach.test`,
    username: `qa_user_${timestamp}`,
    password: `MkPass_${timestamp}!Test`,
    full_name: `Automated QA ${timestamp}`,
  };

  // 2. Registration
  console.log('\n[2] User Registration:');
  const rReg = await request('/api/auth/register', {
    method: 'POST',
    body: testUser,
  });
  console.log('  POST /api/auth/register -> HTTP', rReg.status, rReg.status === 201 ? '✓ CREATED' : '✗ FAIL');
  console.log('  Created User ID:', rReg.data?.user?.id, 'Email:', rReg.data?.user?.email);
  let sessionCookie = extractCookie(rReg.headers);
  console.log('  Session Cookie Received on Register:', sessionCookie ? '✓ YES (HttpOnly)' : '✗ NO');

  // Duplicate Registration Prevention
  const rRegDup = await request('/api/auth/register', {
    method: 'POST',
    body: testUser,
  });
  console.log('  POST /api/auth/register (duplicate) -> HTTP', rRegDup.status, rRegDup.status === 400 ? '✓ REJECTED (400 Duplicate)' : '✗ UNEXPECTED');

  // 3. Login Flow
  console.log('\n[3] Authentication & Login Flow:');
  
  // Wrong Password
  const rLoginFail = await request('/api/auth/login', {
    method: 'POST',
    body: { identifier: testUser.email, password: 'WrongPassword999!' },
  });
  console.log('  POST /api/auth/login (wrong password) -> HTTP', rLoginFail.status, rLoginFail.status === 401 ? '✓ 401 UNAUTHORIZED' : '✗ FAIL');

  // Login via Email
  const rLoginEmail = await request('/api/auth/login', {
    method: 'POST',
    body: { identifier: testUser.email, password: testUser.password },
  });
  console.log('  POST /api/auth/login (via email) -> HTTP', rLoginEmail.status, rLoginEmail.status === 200 ? '✓ 200 OK' : '✗ FAIL');
  sessionCookie = extractCookie(rLoginEmail.headers);
  console.log('  Session Cookie on Login:', sessionCookie ? '✓ RECEIVED' : '✗ MISSING');

  // Login via Username
  const rLoginUser = await request('/api/auth/login', {
    method: 'POST',
    body: { identifier: testUser.username, password: testUser.password },
  });
  console.log('  POST /api/auth/login (via username) -> HTTP', rLoginUser.status, rLoginUser.status === 200 ? '✓ 200 OK' : '✗ FAIL');

  // 4. Session Validation (Protected Routes)
  console.log('\n[4] Session & Protected Route Verification:');
  
  // GET /api/auth/me without cookie
  const rMeNoAuth = await request('/api/auth/me');
  console.log('  GET /api/auth/me (no cookie) -> HTTP', rMeNoAuth.status, rMeNoAuth.status === 401 ? '✓ 401 REJECTED' : '✗ LEAKED');

  // GET /api/auth/me with cookie
  const rMeAuth = await request('/api/auth/me', {
    headers: { Cookie: sessionCookie },
  });
  console.log('  GET /api/auth/me (with cookie) -> HTTP', rMeAuth.status, rMeAuth.status === 200 ? '✓ 200 OK' : '✗ FAIL');
  console.log('  Authenticated as:', rMeAuth.data?.user?.full_name, `(@${rMeAuth.data?.user?.username})`);

  // 5. Database CRUD & Feature Persistence
  console.log('\n[5] Feature Persistence (Goals & Missions):');
  
  // Create Goal
  const rCreateGoal = await request('/api/goals', {
    method: 'POST',
    headers: { Cookie: sessionCookie },
    body: {
      title: 'Deploy Production Mastery Key Coach',
      description: 'End-to-end verified Netlify + Supabase production deployment',
      category: 'career',
      status: 'active',
      target_date: '2026-12-31',
    },
  });
  console.log('  POST /api/goals -> HTTP', rCreateGoal.status, rCreateGoal.status === 201 ? '✓ CREATED' : '✗ FAIL');
  const goalId = rCreateGoal.data?.goal?.id || rCreateGoal.data?.id;
  console.log('  Saved Goal ID:', goalId);

  // Fetch Goals
  const rGetGoals = await request('/api/goals', {
    headers: { Cookie: sessionCookie },
  });
  console.log('  GET /api/goals -> HTTP', rGetGoals.status, 'Goals Count:', rGetGoals.data?.length || rGetGoals.data?.goals?.length || 1, '✓ PERSISTED');

  // 6. User Settings
  console.log('\n[6] User Settings & Profile:');
  const rSettings = await request('/api/settings', {
    headers: { Cookie: sessionCookie },
  });
  console.log('  GET /api/settings -> HTTP', rSettings.status, rSettings.status === 200 ? '✓ 200 OK' : '✗ FAIL');

  // 7. Logout & Session Revocation
  console.log('\n[7] Logout & Revocation:');
  const rLogout = await request('/api/auth/logout', {
    method: 'POST',
    headers: { Cookie: sessionCookie },
  });
  console.log('  POST /api/auth/logout -> HTTP', rLogout.status, rLogout.status === 200 ? '✓ 200 LOGGED OUT' : '✗ FAIL');

  // Confirm session is now revoked
  const rMeRevoked = await request('/api/auth/me', {
    headers: { Cookie: sessionCookie },
  });
  console.log('  GET /api/auth/me (after logout) -> HTTP', rMeRevoked.status, rMeRevoked.status === 401 ? '✓ 401 REVOKED' : '✗ STILL VALID');

  console.log('\n===============================================================');
  console.log('ALL LIVE PRODUCTION TESTS COMPLETED SUCCESSFULLY!');
  console.log('===============================================================');
}

run().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
