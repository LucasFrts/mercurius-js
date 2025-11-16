import { REDIS_DB, REDIS_HOST, REDIS_PORT, WEBHOOK_DLQ_NAME, WEBHOOK_QUEUE_NAME } from '../infra/config/env';
import { BullMQWebhookQueue } from '../infra/bullmq/BullMQWebhookQueue';
import { BullMQWebhookWorker } from '../infra/bullmq/BullMQWebhookWorker';
import { FetchWebhookProcessor } from '../infra/http/FetchWebhookProcessor';
import { EnqueueWebhookJobService } from '../application/services/EnqueueWebhookJobService';
import { WorkerService } from '../application/services/WorkerService';

async function bootstrap() {
  const connection = {
    host: REDIS_HOST,
    port: REDIS_PORT,
    db: REDIS_DB
  };

  const queue = new BullMQWebhookQueue({
    queueName: WEBHOOK_QUEUE_NAME,
    connection
  });

  const processor = new FetchWebhookProcessor();

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
  const enqueueService = new EnqueueWebhookJobService(queue);

  await workerService.startProcessing();

  // Exemplo de enfileiramento de um webhook simples
  await enqueueService.execute({
    payload: {
      url: 'https://example.com/webhook',
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: { example: 'payload' }
    }
  });

  // Em um serviço real, o processo ficaria rodando; aqui encerramos após um tempo.
  setTimeout(async () => {
    await workerService.stopProcessing();
    process.exit(0);
  }, 5000);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Worker bootstrap error', err);
  process.exit(1);
});


