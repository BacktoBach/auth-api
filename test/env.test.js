import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateEnv } from '../src/config/env.js';

const validEnv = {
  MONGO_URI: 'mongodb://localhost:27017/auth-test',
  JWT_SECRET: 'a-secure-jwt-secret-with-more-than-32-characters',
  PORT: '3000'
};

test('environment validation accepts a valid configuration', () => {
  assert.deepEqual(validateEnv(validEnv), {
    port: 3000,
    mongoUri: validEnv.MONGO_URI
  });
});

test('environment validation rejects missing variables', () => {
  assert.throws(
    () => validateEnv({}),
    /Missing required environment variables: MONGO_URI, JWT_SECRET/
  );
});

test('environment validation rejects a weak JWT secret', () => {
  assert.throws(
    () => validateEnv({ ...validEnv, JWT_SECRET: 'too-short' }),
    /at least 32 characters/
  );
});

test('environment validation rejects an invalid port', () => {
  assert.throws(
    () => validateEnv({ ...validEnv, PORT: '70000' }),
    /PORT must be an integer between 1 and 65535/
  );
});

test('environment validation enforces the required one-day token lifetime', () => {
  assert.throws(
    () => validateEnv({ ...validEnv, JWT_EXPIRES_IN: '7d' }),
    /JWT_EXPIRES_IN must be 1d/
  );
});
