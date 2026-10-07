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
