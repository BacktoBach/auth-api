import { test } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import User from '../src/models/User.js';

test('User pre-save hook hashes a new password', async () => {
  const plainPassword = 'Password123';
  const user = new User({
    name: 'Hash Test',
    email: 'hash-test@example.com',
    password: plainPassword
  });

  await User.schema.s.hooks.execPre('save', user, [{}]);

  assert.notEqual(user.password, plainPassword);
  assert.equal(await bcrypt.compare(plainPassword, user.password), true);
});

test('User validation rejects passwords longer than 72 UTF-8 bytes', async () => {
  const user = new User({
    name: 'Long Password Test',
    email: 'long-password@example.com',
    password: 'a'.repeat(73)
  });

  await assert.rejects(user.validate(), /Mật khẩu không được vượt quá 72 byte/);
});

test('User starts with tokenVersion zero', () => {
  const user = new User({
    name: 'Token Version Test',
    email: 'token-version@example.com',
    password: 'Password123'
  });

  assert.equal(user.tokenVersion, 0);
});
