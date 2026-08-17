import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { listen } from '../src/utils/httpServer.js';

const close = (server) => new Promise((resolve, reject) => {
  server.close((error) => (error ? reject(error) : resolve()));
});

test('listen rejects with EADDRINUSE when the port is occupied', async () => {
  const app = express();
  const firstServer = await listen(app, 0, '127.0.0.1');
  const { port } = firstServer.address();

  try {
    await assert.rejects(
      listen(app, port, '127.0.0.1'),
      (error) => error.code === 'EADDRINUSE'
    );
  } finally {
    await close(firstServer);
  }
});
