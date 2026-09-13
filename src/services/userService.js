import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import { toPublicUser } from '../utils/userSerializer.js';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
export const MAX_SEARCH_LENGTH = 100;

const parsePositiveInteger = (value, fallback) => {
  if (value === undefined) return fallback;

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new AppError('page và limit phải là số nguyên dương', 400, 'Bad Request');
  }
  return parsed;
};

export const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const buildUserSearchFilter = (value) => {
  if (value === undefined || value === '') return {};
  if (typeof value !== 'string') {
    throw new AppError('search phải là chuỗi', 400, 'Bad Request');
  }

  const search = value.trim();
  if (!search) return {};
  if (search.length > MAX_SEARCH_LENGTH) {
    throw new AppError(
      `search không được vượt quá ${MAX_SEARCH_LENGTH} ký tự`,
      400,
      'Bad Request'
    );
  }

  const escapedSearch = escapeRegExp(search);
  return {
    $or: [
      { name: { $regex: escapedSearch, $options: 'i' } },
      { email: { $regex: escapedSearch, $options: 'i' } }
    ]
  };
};

export const getUsersPage = async (query = {}) => {
  const page = parsePositiveInteger(query.page, DEFAULT_PAGE);
  const requestedLimit = parsePositiveInteger(query.limit, DEFAULT_LIMIT);
  const limit = Math.min(requestedLimit, MAX_LIMIT);
  const skip = (page - 1) * limit;
  const filter = buildUserSearchFilter(query.search);

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter)
  ]);

  return {
    users: users.map(toPublicUser),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};
