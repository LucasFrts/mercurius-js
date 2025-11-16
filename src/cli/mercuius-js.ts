#!/usr/bin/env node

/* eslint-disable no-console */

import { runDefaultWebhookWorker } from '../worker/runWorker';
import { version, name } from '../../package.json';

async function main(): Promise<void> {
  const [, , command] = process.argv;

  if (!command || ['-h', '--help', 'help'].includes(command)) {
    console.log(`${name} v${version}`);
    console.log('');
    console.log('Uso:');
    console.log('  mercurius-js start      Inicia o worker padrão de webhooks (BullMQ + Redis)');
    console.log('');
    console.log('Variáveis de ambiente relevantes:');
    console.log('  REDIS_HOST              Host do Redis (default: 127.0.0.1)');
    console.log('  REDIS_PORT              Porta do Redis (default: 6379)');
    console.log('  REDIS_DB                DB do Redis (default: 0)');
    console.log('  WEBHOOK_QUEUE_NAME      Nome da fila principal (default: mercurius_webhooks)');
    console.log('  WEBHOOK_DLQ_NAME        Nome da DLQ (default: mercurius_webhooks_dlq)');
    process.exit(0);
  }

  if (command === 'start') {
    try {
      console.log(`[${name}] Iniciando worker de webhooks...`);
      await runDefaultWebhookWorker();
      console.log(`[${name}] Worker iniciado. Aguardando jobs...`);
    } catch (err) {
      console.error(`[${name}] Falha ao iniciar worker`, err);
      process.exit(1);
    }
    return;
  }

  console.error(`Comando desconhecido: ${command}`);
  console.error('Use "mercurius-js help" para ver os comandos disponíveis.');
  process.exit(1);
}

void main();


