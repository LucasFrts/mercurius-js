import { enqueueWebhook, WebhookPayloadBuilder } from './webhook';

// Tipos estruturais mínimos para não depender de express diretamente
export interface ExpressRequestLike<TBody = unknown> {
  body: TBody;
}

export interface ExpressResponseLike {
  status(code: number): this;
  json(body: unknown): void;
}

export type ExpressNextFunctionLike = (err?: unknown) => void;

/**
 * Alias específico para Express do builder genérico de payload.
 */
export type ExpressWebhookPayloadBuilder<TBody> =
  WebhookPayloadBuilder<ExpressRequestLike<TBody>>;

/**
 * Helper de integração com Express baseado no helper genérico `enqueueWebhook`.
 *
 * Exemplo:
 *
 * app.post('/users', async (req, res, next) => {
 *   try {
 *     const user = await createUser(...);
 *
 *     await enqueueExpressWebhook(enqueueWebhookJob, req, () => ({
 *       url: tenant.webhookUrl,
 *       method: 'POST',
 *       headers: { 'content-type': 'application/json', 'x-event': 'user.created' },
 *       body: { user },
 *     }));
 *
 *     return res.status(201).json(user);
 *   } catch (err) {
 *     next(err);
 *   }
 * });
 */
export const enqueueExpressWebhook = enqueueWebhook<ExpressRequestLike<unknown>>;

