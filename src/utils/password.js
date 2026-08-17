export const MAX_PASSWORD_BYTES = 72;

export const isPasswordTooLong = (password) => (
  typeof password === 'string' && Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES
);
