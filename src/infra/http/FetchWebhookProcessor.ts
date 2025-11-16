import { WebhookProcessorPort } from '../../application/ports/WebhookProcessorPort';
import { WebhookJobPayload } from '../../domain/webhooks/WebhookJob';
import { LoggerPort } from '../../application/ports/LoggerPort';

export class FetchWebhookProcessor implements WebhookProcessorPort {
  constructor(
    private readonly logger?: LoggerPort
  ) {}

  async process(payload: WebhookJobPayload): Promise<void> {
    const { url, method, headers, body } = payload;

    this.logger?.info('webhook_delivery_start', {
      url,
      method
    });

    const response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      this.logger?.error('webhook_delivery_failed', {
        url,
        method,
        status: response.status,
        statusText: response.statusText
      });
      throw new Error(
        `Webhook delivery failed with status ${response.status}`
      );
    }

    this.logger?.info('webhook_delivery_success', {
      url,
      method,
      status: response.status
    });
  }
}


