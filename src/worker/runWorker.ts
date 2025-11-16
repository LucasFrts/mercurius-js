import { REDIS_DB, REDIS_HOST, REDIS_PORT, WEBHOOK_DLQ_NAME, WEBHOOK_QUEUE_NAME } from '../infra/config/env';
import { BullMQWebhookQueue } from '../infra/bullmq/BullMQWebhookQueue';
import { BullMQWebhookWorker } from '../infra/bullmq/BullMQWebhookWorker';
import { FetchWebhookProcessor } from '../infra/http/FetchWebhookProcessor';
import { EnqueueWebhookJobService } from '../application/services/EnqueueWebhookJobService';
import { WorkerService } from '../application/services/WorkerService';
import { FileLogger } from '../infra/logging/FileLogger';

export interface RunWorkerOptions {
  /**
   * Se verdadeiro, o processo não encerra automaticamente
   * e escuta sinais de encerramento (SIGINT/SIGTERM).
   */
  handleSignals?: boolean;
}

export async function runDefaultWebhookWorker(
  options: RunWorkerOptions = {}
): Promise<void> {
  const logger = new FileLogger();

  const connection = {
    host: REDIS_HOST,
    port: REDIS_PORT,
    db: REDIS_DB
  };

  const processor = new FetchWebhookProcessor(logger);

  const workerAdapter = new BullMQWebhookWorker(
    {
      queueName: WEBHOOK_QUEUE_NAME,
      dlqName: WEBHOOK_DLQ_NAME,
      connection,
      concurrency: 5,
      defaultMaxAttempts: 5
    },
    processor
  );

  const workerService = new WorkerService(workerAdapter);

  await workerService.startProcessing();

  logger.info('worker_started', {
    queue: WEBHOOK_QUEUE_NAME,
    dlq: WEBHOOK_DLQ_NAME,
    redisHost: REDIS_HOST,
    redisPort: REDIS_PORT
  });

  if (options.handleSignals !== false) {
    const shutdown = async () => {
      logger.info('worker_shutdown_signal_received');
      await workerService.stopProcessing();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }
}

export function createEnqueueServiceForCurrentEnv(): EnqueueWebhookJobService {
  const logger = new FileLogger();
  const connection = {
    host: REDIS_HOST,
    port: REDIS_PORT,
    db: REDIS_DB
  };

  const queue = new BullMQWebhookQueue({
    queueName: WEBHOOK_QUEUE_NAME,
    connection
  });

  return new EnqueueWebhookJobService(queue, logger);
}


