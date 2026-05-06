import 'dotenv/config';

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

export const config = {
  port: parseInt(process.env.PORT ?? '3001', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',

  // Firebase — service account JSON encoded as base64
  firebaseServiceAccount: required('FIREBASE_SERVICE_ACCOUNT'),
  firebaseDatabaseUrl: required('FIREBASE_DATABASE_URL'),

  // Cron: 6 AM every day (Slovenia is UTC+1/+2, adjust TZ env on server)
  cronSchedule: process.env.CRON_SCHEDULE ?? '0 6 * * *',

  // How many days of change history to keep in Firebase
  changeHistoryDays: parseInt(process.env.CHANGE_HISTORY_DAYS ?? '30', 10),
};
