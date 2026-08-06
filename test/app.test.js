import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
import { authorize } from '../src/middlewares/authMiddleware.js';

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

test('protected endpoint rejects requests without a Bearer token', async () => {
  const response = await fetch(`${baseUrl}/api/auth/me`);
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.deepEqual(Object.keys(body).sort(), ['error', 'message', 'statusCode']);
  assert.equal(body.error, 'Unauthorized');
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
