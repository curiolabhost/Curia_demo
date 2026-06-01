// Kahoot-style speed-weighted scoring for Pulse live rounds.
//
// A correct answer earns between MIN_CORRECT and MAX_CORRECT points depending on
// how fast it arrived. A wrong (or unanswered) response earns zero.

export const MAX_CORRECT = 1000
export const MIN_CORRECT = 500

/**
 * Compute the score for a single response.
 *
 * @param isCorrect       whether the answer was correct
 * @param durationSeconds the configured time limit for the question
 * @param secondsRemaining server-computed seconds left when the answer landed
 *                         (clamped into [0, durationSeconds])
 */
export function computeScore(
  isCorrect: boolean,
  durationSeconds: number | null | undefined,
  secondsRemaining: number,
): number {
  if (!isCorrect) return 0
  if (!durationSeconds || durationSeconds <= 0) return MAX_CORRECT

  const remaining = Math.max(0, Math.min(secondsRemaining, durationSeconds))
  const fractionUsed = 1 - remaining / durationSeconds // 0 = instant, 1 = at buzzer
  const raw = MAX_CORRECT * (1 - fractionUsed / 2) // full speed → 1000, slowest → 500
  return Math.round(Math.max(MIN_CORRECT, Math.min(MAX_CORRECT, raw)))
}
