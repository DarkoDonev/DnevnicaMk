import type {ConnectionOptions} from 'bullmq';

const DEFAULT_REDIS_HOST = '127.0.0.1';
const DEFAULT_REDIS_PORT = 6379;

function parseInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value ?? '');
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return parsed;
}

export function getRedisConnectionOptions(): ConnectionOptions {
  const host = (process.env['REDIS_HOST'] ?? '').trim() || DEFAULT_REDIS_HOST;
  const port = parseInteger(process.env['REDIS_PORT'], DEFAULT_REDIS_PORT);
  const password = (process.env['REDIS_PASSWORD'] ?? '').trim();
  const username = (process.env['REDIS_USERNAME'] ?? '').trim();
  const db = parseInteger(process.env['REDIS_DB'], 0);

  return {
    host,
    port,
    db,
    ...(username ? {username} : {}),
    ...(password ? {password} : {}),
  };
}
