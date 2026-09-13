import jwt from 'jsonwebtoken';

export const ACCESS_TOKEN_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';
const JWT_ALGORITHM = 'HS256';

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  return process.env.JWT_SECRET;
};

export const getTokenExpiresAt = (payload) => {
  if (!payload || typeof payload.exp !== 'number') {
    throw new Error('JWT expiration claim is missing');
  }
  return new Date(payload.exp * 1000).toISOString();
};

export const createAccessToken = (user) => {
  const token = jwt.sign(
    { tokenVersion: user.tokenVersion ?? 0 },
    getJwtSecret(),
    {
      algorithm: JWT_ALGORITHM,
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
      subject: user._id.toString()
    }
  );
  const decoded = jwt.decode(token);

  return {
    token,
    expiresAt: getTokenExpiresAt(decoded)
  };
};

export const verifyAccessToken = (token) => jwt.verify(
  token,
  getJwtSecret(),
  { algorithms: [JWT_ALGORITHM] }
);
