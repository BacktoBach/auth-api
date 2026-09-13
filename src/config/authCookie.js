export const AUTH_COOKIE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const isProduction = (env) => env.NODE_ENV === 'production';

export const getAuthCookieName = (env = process.env) => (
  isProduction(env) ? '__Host-auth_session' : 'auth_session'
);

const getBaseCookieOptions = (env) => ({
  httpOnly: true,
  secure: isProduction(env),
  sameSite: 'lax',
  path: '/'
});

export const getAuthCookieOptions = (
  { remember = false } = {},
  env = process.env
) => ({
  ...getBaseCookieOptions(env),
  ...(remember ? { maxAge: AUTH_COOKIE_MAX_AGE_MS } : {})
});

export const getClearAuthCookieOptions = (env = process.env) => (
  getBaseCookieOptions(env)
);
