import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { registerLimiter } from '../src/middlewares/rateLimitMiddleware.js';
import { listen } from '../src/utils/httpServer.js';

const close = (server) => new Promise((resolve, reject) => {
  server.close((error) => (error ? reject(error) : resolve()));
});

test('register limiter returns the standard 429 response after five requests', async () => {
  const app = express();
  app.post('/register', registerLimiter, (req, res) => res.status(201).json({ statusCode: 201 }));
  const server = await listen(app, 0, '127.0.0.1');
  const { port } = server.address();

  try {
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const response = await fetch(`http://127.0.0.1:${port}/register`, { method: 'POST' });
      assert.equal(response.status, 201);
    }

    const limitedResponse = await fetch(`http://127.0.0.1:${port}/register`, { method: 'POST' });
    assert.equal(limitedResponse.status, 429);
    assert.deepEqual(await limitedResponse.json(), {
      message: 'Bạn đã đăng ký quá nhiều lần, vui lòng thử lại sau',
      error: 'Too Many Requests',
      statusCode: 429
    });
  } finally {
    await close(server);
  }
});
