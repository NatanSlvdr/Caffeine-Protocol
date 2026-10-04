import { UNLOCKS, blockFields, spokenBlock, type RobotRole } from '@/domain';

/** What a library block does, for the robot whose routine is open, saying only what that shift has unlocked. */
export function blockHelp(
  command: string,
  role: RobotRole,
  level: number,
): { name: string; text: string; example: string } {
  const has = (unlock: keyof typeof UNLOCKS) => level >= UNLOCKS[unlock];
  const closed = has('closing') ? ' After the last guest it hears Closed instead.' : '';
  const family = blockFields(command).family;
  const text = {
    WAIT: {
      query: `Waits for the next customer and hears their order. The blocks after it work from what was said.${closed}`,
      prep: `Waits at the handoff for Query’s next ticket and claims it.${closed}`,
      floor: `Wait for Orders claims the next ready drink${has('clearing') ? '; Wait for Dirty cups picks a used cup to clear' : ''}.${closed}`,
    },
    TAKE: {
      query: 'Takes a fresh sheet of paper from the stack in that direction.',
      prep: `Takes from the station in that direction: beans or leaves at storage, water at the sink${has('prepSugar') ? ', a cube at the sugar' : ''}${has('toGo') ? ', a lid at the lids' : ''}.`,
      floor: `Picks up from the tile in that direction: a ready drink at pickup${has('clearing') ? ', a used cup at its table' : ''}.`,
    },
    ITEM: `Writes on the paper Query holds: how many of which drink${has('sugar') ? ', the sugar' : ''}${has('toGo') ? ', or a mark like To go' : ''}.`,
    MOVE: 'Walks that many tiles in a screen direction. A blocked move stops early; customers never block the way.',
    'MOVE TO': 'Walks Porter to the table or place stored in a variable, finding the way by itself.',
    DEPOSIT: {
      query: 'Puts the paper down in that direction, on the order handoff for the kitchen.',
      prep: 'Puts the finished drink down in that direction, at pickup.',
      floor: `Puts down what Porter carries in that direction: a drink on its table${has('clearing') ? ', a used cup in the sink' : ''}.`,
    },
    USE: `Works the station in that direction: the coffee machine grinds beans, then brews${has('cups') ? '; the sink washes used cups' : ''}.`,
    IF: `Runs the blocks inside only when its condition holds, and the Else blocks otherwise.${role === 'query' ? ' Conditions test what the customer said.' : ''}`,
    JUMP: 'Carries on from a Jump destination instead of the next block. A Jump back to Wait for Orders serves the next one.',
    FOR: {
      query: 'Runs the blocks inside once for each item in the order, with item standing for the one in hand.',
      prep: 'Runs the blocks inside a number of times, set by a variable or a number.',
      floor: 'Runs the blocks inside a number of times, set by a variable or a number.',
    },
    STORE: {
      query: 'Keeps a number in a variable: one heard in the item, a fixed number, or another variable’s.',
      prep: 'Keeps a number in a variable, like how much sugar the order asks for.',
      floor: 'Keeps a place in a variable, like the order’s table, for Move to.',
    },
    HELP: 'Asks Niko what an unclear customer meant; the answer replaces what Query heard. Use it before taking paper.',
    ERROR: 'Stops the service, reporting an order Query can’t serve.',
    FUNCTION: 'Names a group of blocks that Call runs from anywhere in the routine.',
    CALL: 'Runs the named function, then carries on from the block after the Call.',
    RETURN: 'Leaves the function early and goes back to the block after its Call.',
    STOP: 'Ends this robot’s day. Stop once Wait for Orders hears Closed and nothing is in hand.',
  }[family];
  const said = typeof text === 'object' ? text[role] : (text ?? '');
  // Blocks with operands show one way to fill them in; the rest are their own example.
  const example = /^(MOVE|MOVE TO|TAKE|DEPOSIT|USE|ITEM|IF|FOR|STORE)$/.test(family)
    ? spokenBlock(command).replace(/^./, (c) => c.toUpperCase())
    : '';
  const name = family === 'STORE' ? 'Store' : blockFields(command).verb;
  return { name, text: said, example };
}

/** The same help as one sentence, read with the library button. */
export const spokenHelp = ({ text, example }: ReturnType<typeof blockHelp>) =>
  example ? `${text} For example: ${example}.` : text;
