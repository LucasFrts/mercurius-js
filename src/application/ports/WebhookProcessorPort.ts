import { WebhookJobPayload } from '../../domain/webhooks/WebhookJob';

export interface WebhookProcessorPort {
  process(payload: WebhookJobPayload): Promise<void>;
}


