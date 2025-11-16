import { enqueueWebhook, WebhookPayloadBuilder } from './webhook';

// Tipos estruturais mínimos para não depender de fastify diretamente
export interface FastifyRequestLike<TBody = unknown> {
  body: TBody;
}

/**
 * Alias específico para Fastify do builder genérico de payload.
 */
export type FastifyWebhookPayloadBuilder<TBody> =
  WebhookPayloadBuilder<FastifyRequestLike<TBody>>;

/**
 * Helper de conveniência para Fastify baseado no helper genérico `enqueueWebhook`.
 *
 * Exemplo:
 *
 * fastify.post('/users', async (request, reply) => {
 *   const user = await createUser(...);
 *
 *   await enqueueFastifyWebhook(enqueueWebhookJob, request, () => ({
 *     url: tenant.webhookUrl,
 *     method: 'POST',
 *     headers: { 'content-type': 'application/json', 'x-event': 'user.created' },
 *     body: { user },
 *   }));
 *
 *   return reply.code(201).send(user);
 * });
 */
export const enqueueFastifyWebhook = enqueueWebhook<FastifyRequestLike<unknown>>;

