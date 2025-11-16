import { Job } from '../../src/domain/jobs/Job';
import { JobState } from '../../src/domain/jobs/JobState';
import { WebhookJobPayload } from '../../src/domain/webhooks/WebhookJob';

describe('Job (domínio)', () => {
  const basePayload: WebhookJobPayload = {
    url: 'https://example.com/webhook',
    method: 'POST'
  };

  function createJob(state: JobState = 'pending') {
    const now = new Date();
    return new Job<WebhookJobPayload, typeof state>({
      id: 'job-1',
      type: 'webhook.delivery',
      payload: basePayload,
      state,
      attempts: 0,
      maxAttempts: 3,
      createdAt: now,
      updatedAt: now
    });
  }

  it('deve permitir transição de pending para completed', () => {
    const job = createJob('pending');

    job.transition('completed');

    expect(job.state).toBe('completed');
  });

  it('deve permitir transição de pending para failed', () => {
    const job = createJob('pending');

    job.transition('failed');

    expect(job.state).toBe('failed');
  });

  it('deve lançar erro ao tentar transicionar a partir de estado terminal', () => {
    const job = createJob('completed');

    expect(() => {
      // forçando uso incorreto em runtime; tipo já desestimula essa chamada
      job.transition('failed' as JobState);
    }).toThrow('Invalid state transition from completed to failed');
  });

  it('deve incrementar tentativas e atualizar updatedAt', () => {
    const job = createJob('pending');
    const before = job.updatedAt;

    job.incrementAttempts();

    expect(job.attempts).toBe(1);
    expect(job.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });
});


