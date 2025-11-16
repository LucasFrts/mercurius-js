import { EnqueueWebhookJobService } from '../../src/application/services/EnqueueWebhookJobService';
import { WebhookJobPayload } from '../../src/domain/webhooks/WebhookJob';
import { WebhookJobQueuePort } from '../../src/application/ports/WebhookJobQueuePort';
import { Job } from '../../src/domain/jobs/Job';

class FakeWebhookQueue implements WebhookJobQueuePort {
  public readonly name = 'fake_queue';
  public jobs: Array<{ job: Job<WebhookJobPayload>; delayMs?: number }> = [];

  async enqueue(job: Job<WebhookJobPayload>, options?: { delayMs?: number }): Promise<void> {
    this.jobs.push({ job, delayMs: options?.delayMs });
  }
}

describe('EnqueueWebhookJobService', () => {
  const payload: WebhookJobPayload = {
    url: 'https://example.com/webhook',
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: { hello: 'world' }
  };

  it('deve criar job pending e chamar fila com maxAttempts padrão', async () => {
    const queue = new FakeWebhookQueue();
    const service = new EnqueueWebhookJobService(queue);

    const job = await service.execute({ payload });

    expect(job.id).toBeDefined();
    expect(job.state).toBe('pending');
    expect(job.attempts).toBe(0);
    expect(job.maxAttempts).toBe(5);

    expect(queue.jobs).toHaveLength(1);
    expect(queue.jobs[0]?.job.id).toBe(job.id);
    expect(queue.jobs[0]?.delayMs).toBeUndefined();
  });

  it('deve respeitar maxAttempts e delayMs customizados', async () => {
    const queue = new FakeWebhookQueue();
    const service = new EnqueueWebhookJobService(queue);

    const job = await service.execute({
      payload,
      maxAttempts: 10,
      delayMs: 1500
    });

    expect(job.maxAttempts).toBe(10);
    expect(queue.jobs[0]?.delayMs).toBe(1500);
  });
});


