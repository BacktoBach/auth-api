import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
import { authorize } from '../src/middlewares/authMiddleware.js';
import User from '../src/models/User.js';
import { createAccessToken } from '../src/utils/token.js';

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test('GET /health reports that the database is disconnected in an isolated test', async () => {
  const response = await fetch(`${baseUrl}/health`);
  const body = await response.json();

  assert.equal(response.status, 503);
  assert.equal(body.status, 'unhealthy');
  assert.equal(body.database, 'disconnected');
  assert.equal(body.statusCode, 503);
});

test('GET / shows API information', async () => {
  const response = await fetch(baseUrl);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.message, 'Chào mừng đến với JWT Auth API');
  assert.equal(body.endpoints.login, 'POST /api/auth/login');
});

test('unknown endpoint returns the standard error shape', async () => {
  const response = await fetch(`${baseUrl}/not-found`);
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.error, 'Not Found');
  assert.equal(body.statusCode, 404);
  assert.equal(typeof body.message, 'string');
});

test('protected endpoint rejects requests without an auth cookie', async () => {
  const response = await fetch(`${baseUrl}/api/auth/me`);
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.deepEqual(Object.keys(body).sort(), ['error', 'message', 'statusCode']);
  assert.equal(body.error, 'Unauthorized');
});

test('protected endpoint rejects an invalid auth cookie', async () => {
  const response = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { cookie: 'auth_session=invalid-token' }
  });
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.error, 'Unauthorized');
  assert.equal(body.statusCode, 401);
});

test('login sets an auth cookie without exposing JWT and cookie authenticates /me', async () => {
  const previousSecret = process.env.JWT_SECRET;
  const originalFindOne = User.findOne;
  const originalFindById = User.findById;
  const fakeUser = {
    _id: { toString: () => '507f1f77bcf86cd799439011' },
    name: 'Cookie User',
    email: 'cookie@example.com',
    role: 'user',
    tokenVersion: 0,
    comparePassword: async (password) => password === 'Password123'
  };

  process.env.JWT_SECRET = 'integration-test-secret-with-at-least-32-characters';
  User.findOne = () => ({ select: async () => fakeUser });
  User.findById = async () => fakeUser;

  try {
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: fakeUser.email,
        password: 'Password123',
        remember: true
      })
    });
    const loginBody = await loginResponse.json();
    const setCookie = loginResponse.headers.get('set-cookie');
    const requestCookie = setCookie.split(';', 1)[0];

    assert.equal(loginResponse.status, 200);
    assert.equal('token' in loginBody, false);
    assert.equal(loginBody.user.email, fakeUser.email);
    assert.equal(typeof loginBody.session.expiresAt, 'string');
    assert.match(setCookie, /^auth_session=/);
    assert.match(setCookie, /HttpOnly/i);
    assert.match(setCookie, /Max-Age=86400/i);

    const meResponse = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { cookie: requestCookie }
    });
    const meBody = await meResponse.json();

    assert.equal(meResponse.status, 200);
    assert.equal(meBody.user.email, fakeUser.email);
    assert.equal(meBody.session.expiresAt, loginBody.session.expiresAt);
  } finally {
    User.findOne = originalFindOne;
    User.findById = originalFindById;
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});

test('logout clears the auth cookie even without a valid session', async () => {
  const response = await fetch(`${baseUrl}/api/auth/logout`, {
    method: 'POST',
    headers: { cookie: 'auth_session=invalid-token' }
  });
  const body = await response.json();
  const cookie = response.headers.get('set-cookie');

  assert.equal(response.status, 200);
  assert.equal(body.message, 'Đăng xuất thành công');
  assert.match(cookie, /^auth_session=;/);
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=Lax/i);
  assert.match(cookie, /Path=\//i);
});

test('change password clears cookie and revokes the previous token version', async () => {
  const previousSecret = process.env.JWT_SECRET;
  const originalFindById = User.findById;
  const fakeUser = {
    _id: { toString: () => '507f1f77bcf86cd799439012' },
    name: 'Password User',
    email: 'password@example.com',
    role: 'user',
    tokenVersion: 0,
    password: 'existing-hash',
    comparePassword: async (password) => password === 'OldPassword123',
    save: async () => {}
  };

  process.env.JWT_SECRET = 'password-test-secret-with-at-least-32-characters';
  const { token } = createAccessToken(fakeUser);
  User.findById = () => ({
    select: async () => fakeUser,
    then: (resolve, reject) => Promise.resolve(fakeUser).then(resolve, reject)
  });

  try {
    const response = await fetch(`${baseUrl}/api/auth/change-password`, {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        cookie: `auth_session=${token}`
      },
      body: JSON.stringify({
        oldPassword: 'OldPassword123',
        newPassword: 'NewPassword123'
      })
    });
    const body = await response.json();
    const clearedCookie = response.headers.get('set-cookie');

    assert.equal(response.status, 200);
    assert.equal(body.statusCode, 200);
    assert.equal(fakeUser.tokenVersion, 1);
    assert.match(clearedCookie, /^auth_session=;/);

    const oldTokenResponse = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { cookie: `auth_session=${token}` }
    });
    const oldTokenBody = await oldTokenResponse.json();

    assert.equal(oldTokenResponse.status, 401);
    assert.match(oldTokenBody.message, /Token đã bị thu hồi/);
  } finally {
    User.findById = originalFindById;
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});

test('unsafe request rejects an untrusted browser origin', async () => {
  const response = await fetch(`${baseUrl}/api/auth/logout`, {
    method: 'POST',
    headers: { origin: 'https://evil.example' }
  });
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.error, 'Forbidden');
  assert.equal(body.statusCode, 403);
});

test('unsafe request accepts an explicitly allowed browser origin', async () => {
  const previousOrigin = process.env.CLIENT_ORIGIN;
  process.env.CLIENT_ORIGIN = 'https://frontend.example';

  try {
    const response = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { origin: 'https://frontend.example' }
    });

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('access-control-allow-origin'), 'https://frontend.example');
    assert.equal(response.headers.get('access-control-allow-credentials'), 'true');
  } finally {
    if (previousOrigin === undefined) delete process.env.CLIENT_ORIGIN;
    else process.env.CLIENT_ORIGIN = previousOrigin;
  }
});

test('register returns 400 instead of 500 when JSON Content-Type is missing', async () => {
  const response = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    body: JSON.stringify({
      name: 'Test User',
      email: 'test@example.com',
      password: 'Password123'
    })
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error, 'Bad Request');
  assert.equal(body.statusCode, 400);
  assert.deepEqual(body.errors.map(({ field }) => field), ['name', 'email', 'password']);
});

test('malformed JSON returns the standard Bad Request response', async () => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{invalid-json'
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.deepEqual(body, {
    message: 'JSON không hợp lệ',
    error: 'Bad Request',
    statusCode: 400
  });
});

test('RBAC rejects a user from an admin-only action', () => {
  let receivedError;
  authorize('admin')(
    { user: { role: 'user' } },
    {},
    (error) => { receivedError = error; }
  );

  assert.equal(receivedError.statusCode, 403);
  assert.equal(receivedError.error, 'Forbidden');
});
