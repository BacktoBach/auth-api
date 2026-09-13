import { parseClientOrigins } from './origins.js';

const MIN_JWT_SECRET_LENGTH = 32;

export const validateEnv = (env = process.env) => {
  const required = ['MONGO_URI', 'JWT_SECRET'];
  if (env.NODE_ENV === 'production') required.push('CLIENT_ORIGIN');

  const missing = required.filter(
    (name) => typeof env[name] !== 'string' || !env[name].trim()
  );

  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if (env.JWT_SECRET.trim().length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(`JWT_SECRET must contain at least ${MIN_JWT_SECRET_LENGTH} characters`);
  }

  if (!/^mongodb(?:\+srv)?:\/\//.test(env.MONGO_URI.trim())) {
    throw new Error('MONGO_URI must start with mongodb:// or mongodb+srv://');
  }

  if (env.JWT_EXPIRES_IN && env.JWT_EXPIRES_IN !== '1d') {
    throw new Error('JWT_EXPIRES_IN must be 1d for this project');
  }

  const clientOrigins = parseClientOrigins(env.CLIENT_ORIGIN);
  clientOrigins.forEach((origin) => {
    let parsed;
    try {
      parsed = new URL(origin);
    } catch {
      throw new Error(`CLIENT_ORIGIN contains an invalid URL: ${origin}`);
    }

    if (parsed.origin !== origin) {
      throw new Error(`CLIENT_ORIGIN must contain origins without paths or trailing slashes: ${origin}`);
    }

    if (env.NODE_ENV === 'production' && parsed.protocol !== 'https:') {
      throw new Error('CLIENT_ORIGIN must use https in production');
    }
  });

  const port = Number(env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }

  return Object.freeze({
    port,
    mongoUri: env.MONGO_URI.trim()
  });
};

export { MIN_JWT_SECRET_LENGTH };
