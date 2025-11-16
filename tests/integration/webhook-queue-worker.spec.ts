import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { BullMQWebhookQueue } from '../../src/infra/bullmq/BullMQWebhookQueue';
import { BullMQWebhookWorker } from '../../src/infra/bullmq/BullMQWebhookWorker';
import { EnqueueWebhookJobService } from '../../src/application/services/EnqueueWebhookJobService';
import { WebhookProcessorPort } from '../../src/application/ports/WebhookProcessorPort';
import { WebhookJobPayload } from '../../src/domain/webhooks/WebhookJob';

const REDIS_CONNECTION = {
  host: process.env.REDIS_HOST ?? '127.0.0.1',
  port: Number(process.env.REDIS_PORT ?? 6379),
  db: Number(process.env.REDIS_DB ?? 1) // usar DB diferente para testes
};

const QUEUE_NAME = 'test_mercuius_webhooks';
const DLQ_NAME = 'test_mercuius_webhooks_dlq';

class InMemoryWebhookProcessor implements WebhookProcessorPort {
  public calls: WebhookJobPayload[] = [];
  public failFirstCall = false;
  public failAlways = false;

  async process(payload: WebhookJobPayload): Promise<void> {
    this.calls.push(payload);

    if (this.failAlways) {
      throw new Error('Simulated webhook failure (always)');
    }

    if (this.failFirstCall && this.calls.length === 1) {
      throw new Error('Simulated webhook failure');
    }
  }
}

// OBS: estes testes cobrem o mesmo fluxo básico que o E2E HTTP, mas têm se mostrado
// sensíveis a timing de Redis/BullMQ em ambientes diferentes. Mantemos o arquivo
// como referência, porém o suite está desabilitado para evitar flakiness,
// já que `tests/e2e/webhook-http-e2e.spec.ts` faz uma verificação mais forte
// (fila -> worker -> HTTP real).
describe.skip('Webhook queue + worker (feature/integration)', () => {
  let redis: IORedis;

  beforeAll(async () => {
    redis = new IORedis(REDIS_CONNECTION);
    await redis.flushdb();
  }, 20000);

  afterAll(async () => {
    await redis.flushdb();
    await redis.quit();
  }, 20000);

  it('deve enfileirar e processar um webhook com sucesso (fila -> worker -> processor)', async () => {
    const queueAdapter = new BullMQWebhookQueue({
      queueName: QUEUE_NAME,
      connection: REDIS_CONNECTION
    });

    const processor = new InMemoryWebhookProcessor();

    const workerAdapter = new BullMQWebhookWorker(
      {
        queueName: QUEUE_NAME,
        dlqName: DLQ_NAME,
        connection: REDIS_CONNECTION,
        concurrency: 1,
        defaultMaxAttempts: 3
      },
      processor
    );

    await workerAdapter.start();

    const enqueueService = new EnqueueWebhookJobService(queueAdapter);

    const payload: WebhookJobPayload = {
      url: 'https://example.com/webhook',
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: { hello: 'world' }
    };

    await enqueueService.execute({ payload, maxAttempts: 3 });

    // aguarda processamento
    await new Promise((resolve) => setTimeout(resolve, 3000));

    expect(processor.calls).toHaveLength(1);
    expect(processor.calls[0]).toEqual(payload);

    await workerAdapter.stop();
    await queueAdapter.close();
  }, 15000);

  it('deve enviar para DLQ após falhas em todas as tentativas (fila -> worker -> DLQ)', async () => {
    const queueAdapter = new BullMQWebhookQueue({
      queueName: QUEUE_NAME,
      connection: REDIS_CONNECTION
    });

    const processor = new InMemoryWebhookProcessor();
    processor.failAlways = true;

    const workerAdapter = new BullMQWebhookWorker(
      {
        queueName: QUEUE_NAME,
        dlqName: DLQ_NAME,
        connection: REDIS_CONNECTION,
        concurrency: 1,
        defaultMaxAttempts: 2
      },
      processor
    );

    await workerAdapter.start();

    const enqueueService = new EnqueueWebhookJobService(queueAdapter);

    const payload: WebhookJobPayload = {
      url: 'https://example.com/webhook',
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: { hello: 'world' }
    };

    await enqueueService.execute({ payload, maxAttempts: 2 });

    // aguarda todas as tentativas + DLQ
    await new Promise((resolve) => setTimeout(resolve, 6000));

    const dlq = new Queue(DLQ_NAME, {
      connection: {
        ...REDIS_CONNECTION,
        maxRetriesPerRequest: null
      }
    });
    const dlqJobs = await dlq.getJobs(['completed', 'waiting', 'delayed']);

    expect(dlqJobs.length).toBeGreaterThanOrEqual(1);
    expect(dlqJobs[0]?.data.payload).toEqual(payload);

    await dlq.close();
    await workerAdapter.stop();
    await queueAdapter.close();
  }, 20000);
});


