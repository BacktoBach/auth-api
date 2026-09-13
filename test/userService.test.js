import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildUserSearchFilter,
  escapeRegExp,
  getUsersPage,
  MAX_SEARCH_LENGTH
} from '../src/services/userService.js';
import User from '../src/models/User.js';

test('empty search produces no MongoDB filter', () => {
  assert.deepEqual(buildUserSearchFilter(undefined), {});
  assert.deepEqual(buildUserSearchFilter('   '), {});
});

test('user search escapes regular expression metacharacters', () => {
  const input = 'name.*+?^${}()|[]\\@example.com';
  const escaped = escapeRegExp(input);
  const filter = buildUserSearchFilter(input);

  assert.equal(escaped, 'name\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\@example\\.com');
  assert.equal(filter.$or[0].name.$regex, escaped);
  assert.equal(filter.$or[1].email.$regex, escaped);
  assert.equal(filter.$or[0].name.$options, 'i');
});

test('user search rejects invalid type and excessive length', () => {
  assert.throws(() => buildUserSearchFilter(['user']), /search phải là chuỗi/);
  assert.throws(
    () => buildUserSearchFilter('a'.repeat(MAX_SEARCH_LENGTH + 1)),
    /search không được vượt quá 100 ký tự/
  );
});

test('user list query and count use the same search filter', async () => {
  const originalFind = User.find;
  const originalCountDocuments = User.countDocuments;
  let findFilter;
  let countFilter;

  User.find = (filter) => {
    findFilter = filter;
    return {
      sort() { return this; },
      skip() { return this; },
      limit: async () => []
    };
  };
  User.countDocuments = async (filter) => {
    countFilter = filter;
    return 0;
  };

  try {
    const result = await getUsersPage({ page: '1', limit: '20', search: 'alice' });

    assert.deepEqual(findFilter, countFilter);
    assert.equal(findFilter.$or[0].name.$regex, 'alice');
    assert.deepEqual(result.pagination, {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0
    });
  } finally {
    User.find = originalFind;
    User.countDocuments = originalCountDocuments;
  }
});
