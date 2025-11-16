import { IsValidTransition, JobState } from './JobState';

export interface BaseJobPayload {
  // marcador para extender
}

export interface JobProps<TPayload extends BaseJobPayload> {
  id: string;
  type: string;
  payload: TPayload;
  state: JobState;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  updatedAt: Date;
}

export class Job<TPayload extends BaseJobPayload, TState extends JobState = 'pending'> {
  private props: JobProps<TPayload> & { state: TState };

  constructor(props: JobProps<TPayload> & { state: TState }) {
    this.props = props;
  }

  get id(): string {
    return this.props.id;
  }

  get type(): string {
    return this.props.type;
  }

  get payload(): TPayload {
    return this.props.payload;
  }

  get state(): TState {
    return this.props.state;
  }

  get attempts(): number {
    return this.props.attempts;
  }

  get maxAttempts(): number {
    return this.props.maxAttempts;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  /**
   * Transição de estado com validação em tempo de compilação.
   * Apenas permite transições válidas a partir do estado atual `TState`.
   */
  transition<TTo extends JobState>(
    nextState: TTo
  ): IsValidTransition<TState, TTo> extends true ? Job<TPayload, TTo> : never {
    const isValid =
      this.props.state === 'pending' &&
      (nextState === 'failed' || nextState === 'completed');

    if (!isValid) {
      throw new Error(
        `Invalid state transition from ${this.props.state} to ${nextState}`
      );
    }

    const next: Job<TPayload, TTo> = new Job<TPayload, TTo>({
      ...this.props,
      state: nextState,
      updatedAt: new Date()
    });

    // atualiza instância atual para refletir o novo estado (opcional)
    // mas o retorno tipado favorece o uso imutável
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this as any).props = next.props;

    return next as IsValidTransition<TState, TTo> extends true
      ? Job<TPayload, TTo>
      : never;
  }

  incrementAttempts(): void {
    this.props = {
      ...this.props,
      attempts: this.props.attempts + 1,
      updatedAt: new Date()
    };
  }
}


