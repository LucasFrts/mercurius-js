// Public API de mercuius-js

// ---- Named exports (tipos e classes) ----

// Domínio
export * from './domain/jobs/JobState';
export * from './domain/jobs/Job';
export * from './domain/webhooks/WebhookJob';

// Casos de uso / aplicação
export * from './application/dtos/EnqueueWebhookJobDTO';
export * from './application/ports/WebhookJobQueuePort';
export * from './application/ports/WebhookProcessorPort';
export * from './application/ports/LoggerPort';
export * from './application/services/EnqueueWebhookJobService';
export * from './application/services/WorkerService';

// Infra BullMQ + HTTP
export * from './infra/bullmq/BullMQWebhookQueue';
export * from './infra/bullmq/BullMQWebhookWorker';
export * from './infra/http/FetchWebhookProcessor';
export * from './infra/logging/FileLogger';

// Worker helpers
export * from './worker/runWorker';

// Helpers de integração
export * from './integration/webhook';
export * from './integration/fastify';
export * from './integration/express';

// ---- Default export / função "mercurius" (DX-friendly) ----

import { WebhookJobPayload } from './domain/webhooks/WebhookJob';
import { EnqueueWebhookJobService } from './application/services/EnqueueWebhookJobService';
import { enqueueWebhook } from './integration/webhook';
import { runDefaultWebhookWorker, createEnqueueServiceForCurrentEnv } from './worker/runWorker';

let _defaultEnqueueService: EnqueueWebhookJobService | null = null;

function getDefaultEnqueueService(): EnqueueWebhookJobService {
  if (!_defaultEnqueueService) {
    _defaultEnqueueService = createEnqueueServiceForCurrentEnv();
  }
  return _defaultEnqueueService;
}

export interface DispatchOptions {
  maxAttempts?: number;
  delayMs?: number;
  service?: EnqueueWebhookJobService;
}

/**
 * Função principal de DX: `mercurius(payload)` despacha um webhook para a fila.
 *
 * Uso:
 *
 *   import mercurius from 'mercuius-js';
 *
 *   await mercurius({
 *     url: tenant.webhookUrl,
 *     method: 'POST',
 *     headers: { 'content-type': 'application/json', 'x-event': 'user.created' },
 *     body: { user },
 *   });
 */
export async function mercurius(
  payload: WebhookJobPayload,
  options: DispatchOptions = {}
) {
  const service = options.service ?? getDefaultEnqueueService();
  return service.execute({
    payload,
    maxAttempts: options.maxAttempts,
    delayMs: options.delayMs
  });
}

/**
 * Alias explícito para quem preferir um nome mais descritivo.
 */
export async function dispatchWebhook(
  payload: WebhookJobPayload,
  options?: DispatchOptions
) {
  return mercurius(payload, options);
}

// Default export: função chamável com alguns utilitários anexados
const defaultExport = Object.assign(mercurius, {
  dispatch: dispatchWebhook,
  enqueueWebhook,
  runWorker: runDefaultWebhookWorker,
  createEnqueueServiceForCurrentEnv
});

export default defaultExport;


