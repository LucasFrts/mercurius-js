import { BaseJobPayload, Job } from '../jobs/Job';

export interface EnqueueJobOptions {
  delayMs?: number;
}

export interface JobQueuePort<TPayload extends BaseJobPayload> {
  readonly name: string;

  enqueue(
    job: Job<TPayload>,
    options?: EnqueueJobOptions
  ): Promise<void>;
}


