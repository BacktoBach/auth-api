import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.JWT_SECRET = 'test-secret-with-at-least-32-characters';
process.env.JWT_EXPIRES_IN = '1d';

const {
  createAccessToken,
  verifyAccessToken
} = await import('../src/utils/token.js');

test('access token contains only the required custom claim and expires in one day', () => {
  const token = createAccessToken({
    _id: { toString: () => '507f1f77bcf86cd799439011' },
    tokenVersion: 2,
    name: 'Sensitive Name',
    email: 'sensitive@example.com',
    role: 'admin'
  });
  const decoded = verifyAccessToken(token);

  assert.equal(decoded.sub, '507f1f77bcf86cd799439011');
  assert.equal(decoded.tokenVersion, 2);
  assert.equal(decoded.exp - decoded.iat, 24 * 60 * 60);
  assert.equal(decoded.name, undefined);
  assert.equal(decoded.email, undefined);
  assert.equal(decoded.role, undefined);
});
