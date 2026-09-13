import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AUTH_COOKIE_MAX_AGE_MS,
  getAuthCookieName,
  getAuthCookieOptions,
  getClearAuthCookieOptions
} from '../src/config/authCookie.js';

test('development auth cookie is HTTP-only and supports session mode', () => {
  const env = { NODE_ENV: 'development' };
  const options = getAuthCookieOptions({ remember: false }, env);

  assert.equal(getAuthCookieName(env), 'auth_session');
  assert.deepEqual(options, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/'
  });
  assert.equal('maxAge' in options, false);
});

test('remember mode creates a persistent one-day cookie', () => {
  const options = getAuthCookieOptions(
    { remember: true },
    { NODE_ENV: 'development' }
  );

  assert.equal(options.maxAge, AUTH_COOKIE_MAX_AGE_MS);
});

test('production auth cookie uses secure __Host prefix', () => {
  const env = { NODE_ENV: 'production' };
  const options = getAuthCookieOptions({ remember: true }, env);

  assert.equal(getAuthCookieName(env), '__Host-auth_session');
  assert.equal(options.httpOnly, true);
  assert.equal(options.secure, true);
  assert.equal(options.sameSite, 'lax');
  assert.equal(options.path, '/');
  assert.equal('domain' in options, false);
});

test('clear cookie options match security attributes without expiry settings', () => {
  const options = getClearAuthCookieOptions({ NODE_ENV: 'production' });

  assert.deepEqual(options, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/'
  });
  assert.equal('maxAge' in options, false);
  assert.equal('expires' in options, false);
});
