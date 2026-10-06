import type { CSSProperties } from 'react';
import { STORE_SOURCE_LABELS, labelFor, parseMoveTo, parseStore, parseTimes } from '@/domain';
import { BlockIcon } from './BlockIcon';
import { category, conditionLabels } from './editor/blockMeta';

const word = (value: string) => conditionLabels[value] ?? value;

/** A block in the words its tile shows: the verb, then each field as the tile's own select names it. */
function blockWords(command: string): string {
  if (command.startsWith('POSITION ')) return `Destination ${command.slice(9)}`;
  const store = parseStore(command);
  if (store) return `Store ${word(store.variable)} = ${STORE_SOURCE_LABELS[store.value] ?? word(store.value)}`;
  const member = /^(IF|FOR) (\S+) IN (.+)$/.exec(command);
  if (member) return `${member[1] === 'IF' ? 'If' : 'For'} ${word(member[2])} in ${word(member[3])}`;
  const times = parseTimes(command);
  if (times) return `For ${word(times)} times`;
  const sugar = /^WRITE (\S+) sugar$/.exec(command);
  if (sugar) return `Write ${word(sugar[1])} Sugar`;
  const moveTo = parseMoveTo(command);
  if (moveTo) return `Move to ${word(moveTo)}`;
  const hand = /^(MOVE|TAKE|DEPOSIT|USE) (.+)$/.exec(command);
  if (hand) return `${hand[1][0]}${hand[1].slice(1).toLowerCase()} ${hand[2].toLowerCase()}`;
  const { verb, value } = labelFor(command);
  return [verb, value].filter(Boolean).join(' ');
}

/**
 * A few lines of a routine as tiles that can't be picked up, nested by indent; the depth comes from the routine around
 * them, and `base` is how deep the first of them sits. Spans throughout, so a passage can be what a button says.
 */
export function BlockLines({
  lines,
  base = 0,
  className = '',
}: {
  lines: readonly { command: string; depth: number }[];
  base?: number;
  className?: string;
}) {
  return (
    <span className={`block-lines ${className}`}>
      {lines.map(({ command, depth }, i) => (
        <span key={i} className="block-line" style={{ '--depth': Math.max(0, depth - base) } as CSSProperties}>
          <span className={`command-tile ${category(command)}`}>
            <BlockIcon command={command} />
            {blockWords(command)}
          </span>
        </span>
      ))}
    </span>
  );
}

/** A passage as one sentence, for a screen reader to hear where the tiles only show their order. */
export const spokenLines = (lines: readonly { command: string }[]) =>
  lines.map(({ command }) => blockWords(command)).join(', then ');
