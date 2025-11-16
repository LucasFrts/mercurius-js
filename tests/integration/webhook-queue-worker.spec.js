"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const BullMQWebhookQueue_1 = require("../../src/infra/bullmq/BullMQWebhookQueue");
const BullMQWebhookWorker_1 = require("../../src/infra/bullmq/BullMQWebhookWorker");
const EnqueueWebhookJobService_1 = require("../../src/application/services/EnqueueWebhookJobService");
const REDIS_CONNECTION = {
    host: process.env.REDIS_HOST ?? '127.0.0.1',
    port: Number(process.env.REDIS_PORT ?? 6379),
    db: Number(process.env.REDIS_DB ?? 1) // usar DB diferente para testes
};
const QUEUE_NAME = 'test:hermes:webhooks';
const DLQ_NAME = 'test:hermes:webhooks:dlq';
class InMemoryWebhookProcessor {
    constructor() {
        this.calls = [];
        this.failFirstCall = false;
    }
    async process(payload) {
        this.calls.push(payload);
        if (this.failFirstCall && this.calls.length === 1) {
            throw new Error('Simulated webhook failure');
        }
    }
}
describe('Webhook queue + worker (integration)', () => {
    let redis;
    beforeAll(async () => {
        redis = new ioredis_1.default(REDIS_CONNECTION);
        await redis.flushdb();
    }, 20000);
    afterAll(async () => {
        await redis.flushdb();
        await redis.quit();
    }, 20000);
    it('deve enfileirar e processar um webhook com sucesso', async () => {
        const queueAdapter = new BullMQWebhookQueue_1.BullMQWebhookQueue({
            queueName: QUEUE_NAME,
            connection: REDIS_CONNECTION
        });
        const processor = new InMemoryWebhookProcessor();
        const workerAdapter = new BullMQWebhookWorker_1.BullMQWebhookWorker({
            queueName: QUEUE_NAME,
            dlqName: DLQ_NAME,
            connection: REDIS_CONNECTION,
            concurrency: 1,
            defaultMaxAttempts: 3
        }, processor);
        await workerAdapter.start();
        const enqueueService = new EnqueueWebhookJobService_1.EnqueueWebhookJobService(queueAdapter);
        const payload = {
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
    }, 15000);
    it('deve enviar para DLQ após falhas em todas as tentativas', async () => {
        const queueAdapter = new BullMQWebhookQueue_1.BullMQWebhookQueue({
            queueName: QUEUE_NAME,
            connection: REDIS_CONNECTION
        });
        const processor = new InMemoryWebhookProcessor();
        processor.failFirstCall = true;
        const workerAdapter = new BullMQWebhookWorker_1.BullMQWebhookWorker({
            queueName: QUEUE_NAME,
            dlqName: DLQ_NAME,
            connection: REDIS_CONNECTION,
            concurrency: 1,
            defaultMaxAttempts: 2
        }, processor);
        await workerAdapter.start();
        const enqueueService = new EnqueueWebhookJobService_1.EnqueueWebhookJobService(queueAdapter);
        const payload = {
            url: 'https://example.com/webhook',
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: { hello: 'world' }
        };
        await enqueueService.execute({ payload, maxAttempts: 2 });
        // aguarda todas as tentativas + DLQ
        await new Promise((resolve) => setTimeout(resolve, 6000));
        const dlq = new bullmq_1.Queue(DLQ_NAME, { connection: REDIS_CONNECTION });
        const dlqJobs = await dlq.getJobs(['completed', 'waiting', 'delayed']);
        expect(dlqJobs.length).toBeGreaterThanOrEqual(1);
        expect(dlqJobs[0]?.data.payload).toEqual(payload);
        await dlq.close();
        await workerAdapter.stop();
    }, 20000);
});
//# sourceMappingURL=webhook-queue-worker.spec.js.map