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

test('production environment requires a client origin', () => {
  assert.throws(
    () => validateEnv({ ...validEnv, NODE_ENV: 'production' }),
    /Missing required environment variables: CLIENT_ORIGIN/
  );
});

test('production client origins must use https', () => {
  assert.throws(
    () => validateEnv({
      ...validEnv,
      NODE_ENV: 'production',
      CLIENT_ORIGIN: 'http://frontend.example'
    }),
    /CLIENT_ORIGIN must use https in production/
  );
});

test('environment validation rejects malformed client origins', () => {
  assert.throws(
    () => validateEnv({ ...validEnv, CLIENT_ORIGIN: 'not-a-url' }),
    /CLIENT_ORIGIN contains an invalid URL/
  );
});

test('environment validation rejects origins with paths or trailing slashes', () => {
  assert.throws(
    () => validateEnv({ ...validEnv, CLIENT_ORIGIN: 'http://localhost:5173/' }),
    /must contain origins without paths or trailing slashes/
  );
});
