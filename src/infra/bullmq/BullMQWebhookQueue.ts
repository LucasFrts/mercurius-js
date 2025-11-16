import { Queue } from 'bullmq';
import { RedisOptions } from 'ioredis';
import {
  EnqueueJobOptions,
  JobQueuePort
} from '../../domain/queues/JobQueuePort';
import { Job } from '../../domain/jobs/Job';
import { WebhookJobPayload } from '../../domain/webhooks/WebhookJob';

export interface BullMQQueueConfig {
  queueName: string;
  connection: RedisOptions;
}

export interface BullWebhookJobData {
  id: string;
  payload: WebhookJobPayload;
  maxAttempts: number;
}

export class BullMQWebhookQueue
  implements JobQueuePort<WebhookJobPayload>
{
  public readonly name: string;
  private readonly queue: Queue<BullWebhookJobData>;

  constructor(config: BullMQQueueConfig) {
    this.queue = new Queue<BullWebhookJobData>(config.queueName, {
      connection: {
        ...config.connection,
        // BullMQ 5 exige maxRetriesPerRequest = null
        maxRetriesPerRequest: null
      }
    });
    this.name = config.queueName;
  }

  async enqueue(
    job: Job<WebhookJobPayload>,
    options?: EnqueueJobOptions
  ): Promise<void> {
    await this.queue.add(
      'webhook.delivery',
      {
        id: job.id,
        payload: job.payload,
        maxAttempts: job.maxAttempts
      },
      {
        attempts: job.maxAttempts,
        backoff: {
          type: 'exponential',
          delay: 1000
        },
        removeOnComplete: true,
        removeOnFail: false,
        delay: options?.delayMs ?? 0
      }
    );
  }

  async close(): Promise<void> {
    await this.queue.close();
  }
}


