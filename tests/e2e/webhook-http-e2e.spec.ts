import http, { IncomingMessage, ServerResponse } from 'http';
import IORedis from 'ioredis';
import { AddressInfo } from 'net';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { BullMQWebhookQueue } from '../../src/infra/bullmq/BullMQWebhookQueue';
import { BullMQWebhookWorker } from '../../src/infra/bullmq/BullMQWebhookWorker';
import { EnqueueWebhookJobService } from '../../src/application/services/EnqueueWebhookJobService';
import { WebhookJobPayload } from '../../src/domain/webhooks/WebhookJob';
import { FetchWebhookProcessor } from '../../src/infra/http/FetchWebhookProcessor';
import { FileLogger } from '../../src/infra/logging/FileLogger';

const REDIS_CONNECTION = {
  host: process.env.REDIS_HOST ?? '127.0.0.1',
  port: Number(process.env.REDIS_PORT ?? 6379),
  db: Number(process.env.REDIS_DB ?? 3) // DB separado para E2E
};

const QUEUE_NAME = 'e2e_mercurius_webhooks';
const DLQ_NAME = 'e2e_mercurius_webhooks_dlq';

interface ReceivedRequest {
  method?: string;
  url?: string | null;
  headers: http.IncomingHttpHeaders;
  body?: unknown;
}

describe('E2E HTTP webhook (worker + FetchWebhookProcessor + servidor HTTP real)', () => {
  let redis: IORedis;
  let logDir: string;

  beforeAll(async () => {
    logDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mercurius-e2e-logs-'));
    redis = new IORedis(REDIS_CONNECTION);
    await redis.flushdb();
  }, 20000);

  afterAll(async () => {
    await redis.flushdb();
    await redis.quit();

    if (logDir) {
      const files = await fs.readdir(logDir);
      for (const f of files) {
        await fs.unlink(path.join(logDir, f));
      }
      await fs.rmdir(logDir);
    }
  }, 20000);

  it(
    'deve entregar um webhook real para um servidor HTTP receptor',
    async () => {
      const received: ReceivedRequest[] = [];

      const server = http.createServer(
        (req: IncomingMessage, res: ServerResponse) => {
          let data = '';

          req.on('data', (chunk) => {
            data += chunk;
          });

          req.on('end', () => {
            let body: unknown;
            if (data) {
              try {
                body = JSON.parse(data);
              } catch {
                body = data;
              }
            }

            received.push({
              method: req.method,
              url: req.url,
              headers: req.headers,
              body
            });

            res.statusCode = 200;
            res.end('ok');
          });
        }
      );

      await new Promise<void>((resolve) => {
        server.listen(0, resolve);
      });

      const address = server.address() as AddressInfo;
      const baseUrl = `http://127.0.0.1:${address.port}`;

      const queueAdapter = new BullMQWebhookQueue({
        queueName: QUEUE_NAME,
        connection: REDIS_CONNECTION
      });

      const logger = new FileLogger({
        directory: logDir,
        filePrefix: 'e2e-worker'
      });

      const processor = new FetchWebhookProcessor(logger);

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
        url: `${baseUrl}/webhook-receiver`,
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-webhook-event': 'e2e.test'
        },
        body: {
          message: 'hello from mercurius-js e2e'
        }
      };

      await enqueueService.execute({ payload, maxAttempts: 3 });

      // aguarda processamento e entrega HTTP
      await new Promise((resolve) => setTimeout(resolve, 4000));

      expect(received.length).toBeGreaterThanOrEqual(1);
      const first = received[0];
      expect(first.method).toBe('POST');
      expect(first.url).toBe('/webhook-receiver');
      expect(first.headers['x-webhook-event']).toBe('e2e.test');
      expect(first.body).toEqual(payload.body);

      // verifica logs gerados
      const logFiles = await fs.readdir(logDir);
      expect(logFiles.length).toBeGreaterThanOrEqual(1);
      const logContent = await fs.readFile(
        path.join(logDir, logFiles[0]!),
        'utf8'
      );
      expect(logContent).toContain('webhook_delivery_start');
      expect(logContent).toContain('webhook_delivery_success');

      await workerAdapter.stop();
      await queueAdapter.close();
      server.close();
    },
    25000
  );
});


