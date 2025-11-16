import { EnqueueWebhookJobService } from '../application/services/EnqueueWebhookJobService';
import { WebhookJobPayload } from '../domain/webhooks/WebhookJob';

/**
 * Tipo genérico de função que transforma um "request" (de qualquer framework)
 * em um `WebhookJobPayload` interno.
 *
 * Pode ser usado com Fastify, Express, Next.js, Nest, etc.,
 * desde que você passe o tipo de request correto.
 */
export type WebhookPayloadBuilder<TReq> =
  (req: TReq) => WebhookJobPayload | Promise<WebhookJobPayload>;

/**
 * Helper genérico e minimalista para enfileirar webhooks.
 *
 * Padrão de uso:
 *
 * await enqueueWebhook(enqueueWebhookJob, req, (r) => ({
 *   url: tenant.webhookUrl,
 *   method: 'POST',
 *   headers: { 'content-type': 'application/json', 'x-event': 'user.created' },
 *   body: { user: createdUser },
 * }));
 *
 * A rota continua responsável por devolver a resposta de domínio (ex.: usuário criado).
 */
export async function enqueueWebhook<TReq>(
  enqueueService: EnqueueWebhookJobService,
  req: TReq,
  buildPayload: WebhookPayloadBuilder<TReq>
) {
  const payload = await buildPayload(req);
  return enqueueService.execute({ payload });
}


