/** The steps of the first routine's tips, each ticked off by what the player has done, never by a button. */
export const FIRST_ROUTINE_STEPS = [
  {
    title: 'Build it',
    text: 'Add Take, Write, Move and Deposit under Wait for Orders: tap a library block or drag it into place, then set its fields.',
  },
  { title: 'Run it', text: 'Press Run service and watch Query follow the routine, from top to bottom.' },
  { title: 'Fix it', text: 'The card below says where Query stopped. Change that block, then run again.' },
] as const;

/** The blocks a first ticket needs, by the command each one starts with. */
const NEEDED = ['TAKE ', 'ITEM ', 'MOVE ', 'DEPOSIT '];

/**
 * Which step the player is on, counting from 0: building until the routine has every kind of block a ticket needs,
 * running until a run has finished, then fixing. Worked out afresh from the routine and the runs, so coming back to
 * the shift picks up where the player is rather than starting the tips over.
 */
export function firstRoutineStep(source: string, ran: boolean): number {
  const commands = source.split('\n').map((line) => line.trim());
  const built = NEEDED.every((start) => commands.some((command) => command.startsWith(start)));
  return !built ? 0 : !ran ? 1 : 2;
}
