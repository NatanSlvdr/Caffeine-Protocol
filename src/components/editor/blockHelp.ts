import { UNLOCKS, blockFields, spokenBlock, type RobotRole } from '@/domain';
import { BLOCK_HELP_WORDS, type BlockHelpWords } from './blockHelpWords';

/** What a library block does, for the robot whose routine is open, saying only what that shift has unlocked. */
export function blockHelp(
  command: string,
  role: RobotRole,
  level: number,
  say: BlockHelpWords = BLOCK_HELP_WORDS.en,
): { name: string; text: string; example: string } {
  const family = blockFields(command).family;
  const text = say.help(role, (unlock) => level >= UNLOCKS[unlock])[family];
  const said = typeof text === 'object' ? text[role] : (text ?? '');
  // Blocks with operands show one way to fill them in; the rest are their own example.
  const example = /^(MOVE|MOVE TO|TAKE|DEPOSIT|USE|ITEM|IF|FOR|STORE)$/.test(family)
    ? spokenBlock(command).replace(/^./, (c) => c.toUpperCase())
    : '';
  const name = family === 'STORE' ? 'Store' : blockFields(command).verb;
  return { name, text: said, example };
}

/** The same help as one sentence, read with the library button. */
export const spokenHelp = (
  { text, example }: ReturnType<typeof blockHelp>,
  say: BlockHelpWords = BLOCK_HELP_WORDS.en,
) => say.spoken(text, example);
