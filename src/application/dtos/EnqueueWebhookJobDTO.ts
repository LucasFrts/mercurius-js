import { WebhookJobPayload } from '../../domain/webhooks/WebhookJob';

export interface EnqueueWebhookJobDTO {
  payload: WebhookJobPayload;
  maxAttempts?: number;
  delayMs?: number;
}


