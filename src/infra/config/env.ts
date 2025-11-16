export const REDIS_HOST = process.env.REDIS_HOST ?? '127.0.0.1';
export const REDIS_PORT = Number(process.env.REDIS_PORT ?? 6379);
export const REDIS_DB = Number(process.env.REDIS_DB ?? 0);

export const WEBHOOK_QUEUE_NAME =
  process.env.WEBHOOK_QUEUE_NAME ?? 'mercurius_webhooks';

export const WEBHOOK_DLQ_NAME =
  process.env.WEBHOOK_DLQ_NAME ?? 'mercurius_webhooks_dlq';


