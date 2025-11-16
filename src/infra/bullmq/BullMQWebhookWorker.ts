import { Queue, Worker, Job as BullJob } from 'bullmq';
import { RedisOptions } from 'ioredis';
import { WebhookWorkerPort } from '../../application/services/WorkerService';
import { WebhookProcessorPort } from '../../application/ports/WebhookProcessorPort';
import { BullWebhookJobData } from './BullMQWebhookQueue';

export interface BullMQWorkerConfig {
  queueName: string;
  dlqName: string;
  connection: RedisOptions;
  concurrency?: number;
  defaultMaxAttempts?: number;
}

export class BullMQWebhookWorker implements WebhookWorkerPort {
  private worker?: Worker<BullWebhookJobData>;
  private dlqQueue?: Queue<BullWebhookJobData>;

  constructor(
    private readonly config: BullMQWorkerConfig,
    private readonly processor: WebhookProcessorPort
  ) {}

  async start(): Promise<void> {
    this.worker = new Worker<BullWebhookJobData>(
      this.config.queueName,
      async (job: BullJob<BullWebhookJobData>) => {
        await this.processor.process(job.data.payload);
      },
      {
        connection: {
          ...this.config.connection,
          // BullMQ 5 exige maxRetriesPerRequest = null
          maxRetriesPerRequest: null
        },
        concurrency: this.config.concurrency ?? 1
      }
    );

    this.dlqQueue = new Queue<BullWebhookJobData>(
      this.config.dlqName,
      {
        connection: {
          ...this.config.connection,
          maxRetriesPerRequest: null
        }
      }
    );

    this.worker.on(
      'failed',
      async (job: BullJob<BullWebhookJobData> | undefined) => {
        if (!job) return;

        const attemptsMade = job.attemptsMade ?? 0;
        const maxAttempts =
          job.opts.attempts ?? this.config.defaultMaxAttempts ?? 5;

        if (attemptsMade >= maxAttempts) {
          await this.dlqQueue!.add('webhook.dlq', job.data, {
            removeOnComplete: true,
            removeOnFail: true
          });
        }
      }
    );

    await this.worker.waitUntilReady();
  }

  async stop(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.worker = undefined;
    }

    if (this.dlqQueue) {
      await this.dlqQueue.close();
      this.dlqQueue = undefined;
    }
  }
}


