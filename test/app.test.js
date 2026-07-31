const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');
const { authorize } = require('../src/middlewares/authMiddleware');

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

test('GET /health returns a successful response', async () => {
  const response = await fetch(`${baseUrl}/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { message: 'API is running', statusCode: 200 });
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
