/**
 * Fail fast at boot if the environment is not usable.
 *
 * Passport builds its strategies during module init, and a missing JWT secret
 * there surfaces as an obscure error long after startup. Checking here turns
 * that into one clear message before the app ever listens.
 */
const REQUIRED = [
  'DATABASE_URL',
  'ACCESS_TOKEN_KEY',
  'REFRESH_TOKEN_KEY',
  'ACCESS_TOKEN_TIME',
  'REFRESH_TOKEN_TIME',
] as const;

const MIN_SECRET_LENGTH = 32;

export function validateEnv(config: Record<string, unknown>) {
  const missing = REQUIRED.filter((key) => !config[key]);

  if (missing.length) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
        'Copy .env.example to .env and fill it in.',
    );
  }

  const accessKey = String(config.ACCESS_TOKEN_KEY);
  const refreshKey = String(config.REFRESH_TOKEN_KEY);

  for (const [name, value] of [
    ['ACCESS_TOKEN_KEY', accessKey],
    ['REFRESH_TOKEN_KEY', refreshKey],
  ] as const) {
    if (value.length < MIN_SECRET_LENGTH) {
      throw new Error(
        `${name} must be at least ${MIN_SECRET_LENGTH} characters. ` +
          'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"',
      );
    }
  }

  if (accessKey === refreshKey) {
    throw new Error(
      'ACCESS_TOKEN_KEY and REFRESH_TOKEN_KEY must be different, otherwise a ' +
        'refresh token is accepted as an access token.',
    );
  }

  if (config.AI_CHAT_ENABLED === 'true' && !config.GROQ_API_KEY) {
    throw new Error(
      'AI_CHAT_ENABLED is true but GROQ_API_KEY is empty. Create a key at ' +
        'https://console.groq.com/keys, or set AI_CHAT_ENABLED=false.',
    );
  }

  return config;
}

/** Browser origins allowed to call this API, from CORS_ORIGINS. */
export function corsOrigins(): string[] {
  return (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}
