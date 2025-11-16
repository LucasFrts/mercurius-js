import { randomUUID } from 'crypto';
import { Job } from '../../domain/jobs/Job';
import { WEBHOOK_JOB_TYPE, WebhookJobPayload } from '../../domain/webhooks/WebhookJob';
import { EnqueueWebhookJobDTO } from '../dtos/EnqueueWebhookJobDTO';
import { WebhookJobQueuePort } from '../ports/WebhookJobQueuePort';
import { LoggerPort } from '../ports/LoggerPort';

export class EnqueueWebhookJobService {
  constructor(
    private readonly webhookQueue: WebhookJobQueuePort,
    private readonly logger?: LoggerPort
  ) {}

  async execute(input: EnqueueWebhookJobDTO): Promise<Job<WebhookJobPayload, 'pending'>> {
    const now = new Date();

    const job = new Job<WebhookJobPayload, 'pending'>({
      id: randomUUID(),
      type: WEBHOOK_JOB_TYPE,
      payload: input.payload,
      state: 'pending',
      attempts: 0,
      maxAttempts: input.maxAttempts ?? 5,
      createdAt: now,
      updatedAt: now
    });

    this.logger?.info('enqueue_webhook_job', {
      jobId: job.id,
      type: job.type,
      url: input.payload.url,
      maxAttempts: job.maxAttempts,
      delayMs: input.delayMs
    });

    await this.webhookQueue.enqueue(job, {
      delayMs: input.delayMs
    });

    return job;
  }
}


