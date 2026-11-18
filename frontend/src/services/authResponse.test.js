import test from 'node:test';
import assert from 'node:assert/strict';
import { extractAuthUser } from './authResponse.js';

const user = {
  id: 42,
  email: 'student@example.com',
  username: 'student_mkc',
  full_name: 'MKC Student',
};

test('normalizes Netlify nested authentication responses', () => {
  assert.deepEqual(
    extractAuthUser({ message: 'Login successful', user }),
    user,
  );
});

test('accepts flat FastAPI authentication responses', () => {
  assert.deepEqual(extractAuthUser(user), user);
});

test('returns null for unauthenticated or malformed responses', () => {
  assert.equal(extractAuthUser(null), null);
  assert.equal(extractAuthUser({ user: null }), null);
  assert.equal(extractAuthUser({ detail: 'Not authenticated' }), null);
  assert.equal(extractAuthUser([]), null);
});
