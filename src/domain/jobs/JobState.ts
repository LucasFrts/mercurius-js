export const JobStates = ['pending', 'failed', 'completed'] as const;

export type JobState = (typeof JobStates)[number];

export type TerminalJobState = Extract<JobState, 'failed' | 'completed'>;

export type NonTerminalJobState = Exclude<JobState, TerminalJobState>;

export interface JobStateTransition<
  TFrom extends JobState,
  TTo extends JobState
> {
  from: TFrom;
  to: TTo;
}

/**
 * Tipos condicionais para validar transições de estado.
 */
export type IsValidTransition<
  TFrom extends JobState,
  TTo extends JobState
> = TFrom extends 'pending'
  ? TTo extends 'failed' | 'completed'
    ? true
    : false
  : // estados terminais não podem transicionar
  false;


