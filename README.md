# mercurius-js

> ⚠️ **Status**: Beta (`0.1.0`)

Sistema de enfileiramento de tarefas assíncronas focado em **webhooks B2B**, baseado em **Node.js**, **TypeScript** (strict), **BullMQ** (Redis) e **Jest**, organizado em **Clean Architecture**.

O objetivo do `mercurius-js` é ser um **worker de webhooks plugável** em qualquer aplicação Node (Fastify/Express/etc.), com tipagem de ponta a ponta, retries inteligentes e DLQ.

---

## Features

- **Clean Architecture** (Domínio / Aplicação / Infra):
  - Domínio com `Job`, estados tipados (`'pending' | 'failed' | 'completed'`), `WebhookJobPayload`.
  - Casos de uso de aplicação (`EnqueueWebhookJobService`, `WorkerService`).
  - Infra com BullMQ (fila + worker) e HTTP (`FetchWebhookProcessor`).
- **Tipagem avançada em TypeScript**:
  - Tipos literais para estados de job.
  - Tipos condicionais para validar transições de estado em `Job`.
  - Payloads genéricos e totalmente tipados para webhooks.
- **BullMQ + Redis**:
  - Fila principal de webhooks.
  - Backoff exponencial com limite de tentativas.
  - Dead-Letter Queue (DLQ) para jobs que esgotaram os retries.
- **CLI inclusa**:
  - `mercurius-js start` para iniciar um worker padrão de webhooks.
- **Integrações prontas**:
  - Helpers para Fastify e Express.
- **Testes**:
  - Testes unitários (domínio + casos de uso).
  - Teste E2E com servidor HTTP real recebendo o webhook.

---

## Arquitetura

Estrutura principal (simplificada):

- `src/domain`
  - `jobs/Job.ts`, `jobs/JobState.ts` – entidade `Job` e estados tipados.
  - `webhooks/WebhookJob.ts` – `WebhookJobPayload` e tipo do job de webhook.
- `src/application`
  - `dtos/EnqueueWebhookJobDTO.ts`
  - `ports/WebhookJobQueuePort.ts`, `ports/WebhookProcessorPort.ts`
  - `services/EnqueueWebhookJobService.ts` – caso de uso para enfileirar webhooks.
  - `services/WorkerService.ts` – fachada de aplicação para o worker.
- `src/infra`
  - `config/env.ts` – configuração de Redis e nomes de filas.
  - `bullmq/BullMQWebhookQueue.ts` – adapter BullMQ da fila de webhooks.
  - `bullmq/BullMQWebhookWorker.ts` – worker BullMQ + DLQ.
  - `http/FetchWebhookProcessor.ts` – responsável por disparar o HTTP do webhook.
- `src/integration`
  - `fastify.ts` – helper para criar handler Fastify.
  - `express.ts` – helper para criar handler Express.
- `src/worker/runWorker.ts`
  - `runDefaultWebhookWorker` – inicializa o worker padrão a partir de env vars.
- `src/cli/mercuius-js.ts`
  - CLI (`mercuius-js start`).

---

## Instalação

```bash
npm install mercuius-js
# ou
yarn add mercuius-js
```

> Obs.: este repositório contém o código-fonte do pacote. Ao publicar no npm, o `main` exporta a API pública em `dist/index.js`.

---

## Uso básico

### Despachar um webhook com a função principal `mercurius(...)`

A forma mais simples de usar o pacote é importar o default `mercurius` e chamar a função com um `WebhookJobPayload`:

```ts
import mercurius from 'mercuius-js';

// Ex.: dentro de um caso de uso de criação de usuário
await mercurius({
  url: tenant.webhookUrl, // URL configurada pelo cliente/admin
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'x-webhook-event': 'user.created',
    'x-webhook-tenant': tenant.id,
    // exemplo: assinatura HMAC do evento
    // 'x-webhook-signature': signHmac(event, tenant.secret),
  },
  body: {
    event: 'user.created',
    tenantId: tenant.id,
    user: createdUser,
  },
}, {
  maxAttempts: 5,
  // delayMs: 1000, // opcional
});
```

Sua API responde rápido com os dados de domínio (ex.: usuário criado) e o `mercurius-js` trata o webhook em background via fila.

---

## Integração com Fastify

Um exemplo típico é chamar o `mercurius` **dentro do fluxo da rota**, depois de criar o recurso de domínio:

```ts
import fastify from 'fastify';
import mercurius from 'mercuius-js';

const app = fastify();

app.post('/users', async (request, reply) => {
  const tenant = await loadTenantFromRequest(request);
  const createdUser = await createUserUseCase(request.body);

  await mercurius({
    url: tenant.webhookUrl,
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-webhook-event': 'user.created',
      'x-webhook-tenant': tenant.id,
    },
    body: {
      event: 'user.created',
      tenantId: tenant.id,
      user: createdUser,
    },
  });

  return reply.code(201).send(createdUser);
});
```

Assim você não expõe uma rota genérica de webhook; apenas sua regra de negócio decide quando e para quem disparar.

---

## Integração com Express

Mesma ideia em Express:

```ts
import express from 'express';
import bodyParser from 'body-parser';
import mercurius from 'mercuius-js';

const app = express();
app.use(bodyParser.json());

app.post('/users', async (req, res, next) => {
  try {
    const tenant = await loadTenantFromRequest(req);
    const createdUser = await createUserUseCase(req.body);

    await mercurius({
      url: tenant.webhookUrl,
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-webhook-event': 'user.created',
        'x-webhook-tenant': tenant.id,
      },
      body: {
        event: 'user.created',
        tenantId: tenant.id,
        user: createdUser,
      },
    });

    return res.status(201).json(createdUser);
  } catch (err) {
    next(err);
  }
});
```

---

## Worker: CLI e Docker

### Via CLI (em qualquer app que depende de `mercuius-js`)

```bash
npx mercuius-js start
```

Ou com script no `package.json`:

```json
{
  "scripts": {
    "mercuius:worker": "mercuius-js start"
  }
}
```

Variáveis de ambiente suportadas:

- `REDIS_HOST` (default: `127.0.0.1`)
- `REDIS_PORT` (default: `6379`)
- `REDIS_DB` (default: `0`)
- `WEBHOOK_QUEUE_NAME` (default: `mercuius_webhooks`)
- `WEBHOOK_DLQ_NAME` (default: `mercuius_webhooks_dlq`)

### Via Docker (worker isolado)

Este repo já contém um `Dockerfile` e `docker-compose.yml` de exemplo:

- `Dockerfile` – imagem do worker, usando a CLI:

```15:24:Dockerfile
COPY --from=builder /app/dist ./dist

CMD ["node", "dist/cli/mercuius-js.js", "start"]
```

- `docker-compose.yml` – sobe Redis + worker:

```3:23:docker-compose.yml
services:
  redis:
    image: redis:7-alpine
    container_name: mercuius-redis
    ports:
      - '6379:6379'

  mercuius-worker:
    build: .
    container_name: mercuius-worker
    depends_on:
      - redis
    environment:
      - NODE_ENV=production
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - REDIS_DB=0
      - WEBHOOK_QUEUE_NAME=mercuius_webhooks
      - WEBHOOK_DLQ_NAME=mercuius_webhooks_dlq
    restart: unless-stopped
```

Rodando localmente:

```bash
docker compose up -d --build
```

---

## Testes

- **Unitários**:
  - `tests/unit/job.spec.ts`
  - `tests/unit/enqueue-webhook-job-service.spec.ts`
- **E2E (HTTP real)**:
  - `tests/e2e/webhook-http-e2e.spec.ts`

Para rodar tudo (requere Redis em `127.0.0.1:6379`):

```bash
npm test -- --runInBand
```

Para rodar apenas unitários:

```bash
npm test -- --runTestsByPath tests/unit/job.spec.ts tests/unit/enqueue-webhook-job-service.spec.ts
```

> Há também um arquivo `tests/integration/webhook-queue-worker.spec.ts` que testa apenas fila + worker + DLQ, mas atualmente está marcado como `describe.skip` para evitar flakiness, pois o teste E2E cobre um cenário mais forte (inclui HTTP real).

---

## Roadmap (idéias)

- UI opcional para monitorar filas (ex.: integração com `bull-board`).
- Suporte a multi-tenancy de webhooks “out of the box” (multi filas ou mesma fila com segregação).
- Estratégias configuráveis de backoff e políticas de DLQ.
- Outros tipos de job além de webhooks (e-mail, jobs genéricos).

---

## Licença

ISC – veja o arquivo `LICENSE` (ou ajuste conforme sua necessidade ao publicar o pacote).
