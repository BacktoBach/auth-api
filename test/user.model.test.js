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
