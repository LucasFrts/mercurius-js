import { JobState } from '../../domain/jobs/JobState';

export type WorkerJobStatus = Exclude<JobState, 'pending'>;

export interface WorkerJobResult {
  jobId: string;
  status: WorkerJobStatus;
  error?: Error;
}

export interface WebhookWorkerPort {
  start(): Promise<void>;
  stop(): Promise<void>;
}

/**
 * WorkerService atua como fachada da camada de aplicação para o worker da infraestrutura.
 * Ele expõe uma API de alto nível, independente de BullMQ.
 */
export class WorkerService {
  constructor(
    private readonly worker: WebhookWorkerPort
  ) {}

  async startProcessing(): Promise<void> {
    await this.worker.start();
  }

  async stopProcessing(): Promise<void> {
    await this.worker.stop();
  }
}


