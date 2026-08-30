import 'dotenv/config';

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`[config] Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  port: parseInt(process.env.PORT ?? '4500', 10),

  kaveriApiUrl: required('KAVERI_API_URL', 'http://localhost:8000'),
  serviceEmail: required('KAVERI_SERVICE_EMAIL'),
  servicePassword: required('KAVERI_SERVICE_PASSWORD'),

  serviceToken: required('WHATSAPP_SERVICE_TOKEN'),
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  dbPath: process.env.DATABASE_PATH ?? './whatsapp.db',

  geminiApiKey: process.env.GEMINI_API_KEY ?? '',
  geminiModel: process.env.GEMINI_MODEL ?? 'gemini-3.5-flash-lite',
  botRateLimitPerHour: parseInt(process.env.BOT_RATE_LIMIT_PER_HOUR ?? '20', 10),

  mediaDir: process.env.MEDIA_DIR ?? './media',
  sessionLabel: process.env.SESSION_LABEL ?? 'default-session',
};

export const isGeminiEnabled = () => Boolean(config.geminiApiKey);
