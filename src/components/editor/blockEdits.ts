import { indentSource, placeBlock, visualProgram, type VisualBlock } from '@/domain';
import type { CopyBlocker } from './editorWords';

/** A routine after a block was copied or moved, and the line the block, or its copy, now starts on. */
export interface Edited {
  source: string;
  line: number;
}

interface Place {
  siblings: VisualBlock[];
  parent?: VisualBlock;
  branch?: 'children' | 'alternative';
}

function placeOf(
  blocks: VisualBlock[],
  line: number,
  parent?: VisualBlock,
  branch?: Place['branch'],
): Place | undefined {
  if (blocks.some((b) => b.line === line)) return { siblings: blocks, parent, branch };
  for (const b of blocks)
    for (const inner of ['children', 'alternative'] as const) {
      const found = b[inner] && placeOf(b[inner], line, b, inner);
      if (found) return found;
    }
}

/**
 * Where a block goes, one step up or down: past its neighbour, a whole group at once, or over its own group's edge
 * (between a branch and its else, or out of the group). It never steps into a neighbour's group, so a function stays
 * at the top level and a loop never lands inside another. Undefined at the very top or bottom of the routine.
 */
function moveTarget(source: string, line: number, way: 'up' | 'down'): number | undefined {
  const place = placeOf(visualProgram(source), line);
  if (!place) return;
  const { siblings, parent, branch } = place;
  const i = siblings.findIndex((b) => b.line === line);
  if (way === 'up') {
    if (i > 0) return siblings[i - 1].line;
    if (!parent) return;
    return branch === 'alternative' ? parent.elseLine : parent.line;
  }
  if (i < siblings.length - 1) return siblings[i + 1].end + 1;
  if (!parent) return;
  return branch === 'children' && parent.elseLine !== undefined ? parent.elseLine + 1 : parent.end + 1;
}

export const canMove = (source: string, line: number, way: 'up' | 'down') =>
  moveTarget(source, line, way) !== undefined;

/** The block at `line`, and its group, one step up or down; undefined where it can't go further. */
export function moveBlock(source: string, block: VisualBlock, way: 'up' | 'down'): Edited | undefined {
  const at = moveTarget(source, block.line, way);
  if (at === undefined) return;
  const lines = source.split('\n');
  const content = lines.slice(block.line, block.end + 1).map((l) => l.trim());
  const next = indentSource(placeBlock(source, block.command, at, block.line));
  // An else left empty behind the block is taken out, so find where the block landed rather than count to it.
  const moved = next.split('\n').map((l) => l.trim());
  const expected = at < block.line ? at : at - content.length;
  const starts = moved
    .map((_, i) => i)
    .filter((i) => content.every((c, k) => moved[i + k] === c))
    .sort((a, b) => Math.abs(a - expected) - Math.abs(b - expected));
  return { source: next, line: starts[0] ?? expected };
}

/**
 * Why a block can't be copied, or '' if it can. A jump lands in one place and a function has one name, so a copy of
 * either would make a routine that no longer runs.
 */
export function copyBlocker(source: string, block: VisualBlock): CopyBlocker {
  const content = source
    .split('\n')
    .slice(block.line, block.end + 1)
    .map((l) => l.trim());
  if (content.some((c) => c.startsWith('FUNCTION '))) return 'function';
  if (content.some((c) => c.startsWith('POSITION '))) return 'position';
  return '';
}

/** The block and its group, copied in just below it. */
export function copyBlock(source: string, block: VisualBlock): Edited {
  const lines = source.split('\n');
  lines.splice(block.end + 1, 0, ...lines.slice(block.line, block.end + 1));
  return { source: indentSource(lines.join('\n')), line: block.end + 1 };
}
