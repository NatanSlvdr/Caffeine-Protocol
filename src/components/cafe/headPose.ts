/** Seconds a robot's head shakes once its block fails, before it hangs still. */
export const SHAKE_SECONDS = 1.2;
/** How far a failed robot's head hangs, in radians. */
const HANG = 0.3;

/**
 * Where a robot's head points, in radians: `turn` to its left and `nod` down. Waiting, it glances slowly about the
 * room; once its block fails, it shakes no, dying away, and hangs. Reduced motion keeps only the hang.
 */
export function headPose({
  waiting,
  failedFor,
  clock,
  reduced,
}: {
  waiting: boolean;
  /** Seconds since its block failed, on the wall clock, so the reaction plays out even with the replay stopped. */
  failedFor?: number;
  /** Seconds on the wall clock, for the glance. */
  clock: number;
  reduced: boolean;
}): { turn: number; nod: number } {
  if (failedFor !== undefined) {
    if (reduced) return { turn: 0, nod: HANG };
    const t = Math.max(0, failedFor);
    return {
      turn: t < SHAKE_SECONDS ? 0.38 * Math.sin(t * 15) * (1 - t / SHAKE_SECONDS) : 0,
      nod: HANG * Math.min(1, t / 0.4),
    };
  }
  // Two slow waves, so the glance never settles into a tick.
  if (waiting && !reduced) return { turn: 0.3 * Math.sin(clock * 0.7) * Math.sin(clock * 0.23 + 1), nod: -0.04 };
  return { turn: 0, nod: 0 };
}
