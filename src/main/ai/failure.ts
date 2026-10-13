// Why an AI call failed (pure, tested in failure.test.ts): a short reason for the anonymous stats, never the message.
import { FatalAiError } from './fallback'

export type FailReason = 'offline' | 'busy' | 'slow' | 'server' | 'bad-answer' | 'key' | 'other'

/** An AI error that knows why it happened. */
export class AiError extends Error {
  constructor(
    message: string,
    readonly reason: FailReason,
  ) {
    super(message)
  }
}

export function failReason(e: unknown): FailReason {
  if (e instanceof AiError) return e.reason
  if (e instanceof FatalAiError) return 'key'
  return 'other'
}
