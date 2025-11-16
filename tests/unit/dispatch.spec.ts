import { mercurius, dispatchWebhook } from '../../src';
import { WebhookJobPayload } from '../../src/domain/webhooks/WebhookJob';
import { EnqueueWebhookJobService } from '../../src/application/services/EnqueueWebhookJobService';

class FakeEnqueueService {
  public lastArgs: unknown[] | null = null;

  async execute(args: unknown): Promise<unknown> {
    this.lastArgs = [args];
    return { fake: true };
  }
}

describe('mercuius/dispatchWebhook (dispatcher DX)', () => {
  const payload: WebhookJobPayload = {
    url: 'https://example.com/webhook',
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: { hello: 'world' }
  };

  it('mercuius(payload, { service }) deve delegar para o serviço de enqueue com DTO correto', async () => {
    const fake = new FakeEnqueueService();

    const result = await mercurius(payload, {
      service: fake as unknown as EnqueueWebhookJobService,
      maxAttempts: 7,
      delayMs: 1500
    });

    expect(result).toEqual({ fake: true });
    expect(fake.lastArgs).not.toBeNull();
    const [args] = fake.lastArgs!;
    expect(args).toMatchObject({
      payload,
      maxAttempts: 7,
      delayMs: 1500
    });
  });

  it('dispatchWebhook(payload, { service }) é um alias para mercurius', async () => {
    const fake = new FakeEnqueueService();

    const result = await dispatchWebhook(payload, {
      service: fake as unknown as EnqueueWebhookJobService
    });

    expect(result).toEqual({ fake: true });
    expect(fake.lastArgs).not.toBeNull();
    const [args] = fake.lastArgs!;
    expect(args).toMatchObject({
      payload
    });
  });
});


