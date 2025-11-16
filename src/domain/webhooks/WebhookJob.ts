import { BaseJobPayload } from '../jobs/Job';

export interface WebhookJobPayload extends BaseJobPayload {
  url: string;
  method: 'POST' | 'PUT' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown;
}

export const WEBHOOK_JOB_TYPE = 'webhook.delivery';


