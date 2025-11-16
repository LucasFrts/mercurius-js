import { JobQueuePort } from '../../domain/queues/JobQueuePort';
import { WebhookJobPayload } from '../../domain/webhooks/WebhookJob';

export type WebhookJobQueuePort = JobQueuePort<WebhookJobPayload>;


