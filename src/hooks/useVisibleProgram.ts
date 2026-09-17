import { insideOrderLoop, visualProgram, type VisualBlock } from '@/domain';

export interface VisibleProgramOptions {
  activeLine?: number;
  instructionProgress?: number;
  failureLine?: number;
}

/** Drop preview blocks for the current drag: library source or the dragged scope. */
export function previewProgramBlocks(rows: VisualBlock[], draggedLine: number | null, dragged: string): VisualBlock[] {
  const previewBlock = rows.find((block) => block.line === draggedLine);
  if (draggedLine === null) return visualProgram(dragged);
  if (!previewBlock) return [];
  return [
    previewBlock.command === 'ELSE'
      ? { ...previewBlock, children: rows.find((block) => block.elseLine === draggedLine)?.alternative }
      : previewBlock,
  ];
}

/** Derived program view: rows, failure/active anchors, and jump midpoints. */
export function useVisibleProgram(source: string, { activeLine = -1, instructionProgress = 0, failureLine = -1 }: VisibleProgramOptions = {}) {
  const tree = visualProgram(source);
  const elseBlock = (block: VisualBlock): VisualBlock => ({ line: block.elseLine!, command: 'ELSE', end: block.end - 1 });
  const flatten = (blocks: VisualBlock[]): VisualBlock[] =>
    blocks.flatMap((b) => [b, ...flatten(b.children ?? []), ...(b.alternative?.length ? [elseBlock(b), ...flatten(b.alternative)] : [])]);
  const rows = flatten(tree);
  const visibleFailureLine =
    failureLine < 0 ? -1 : (rows.find((r) => r.line === failureLine) ?? rows.findLast((r) => r.line <= failureLine) ?? rows[0])?.line ?? -1;
  // Playback time drives jumps, so pausing and speed changes preserve the midpoint.
  const activeCommand = source.split('\n')[activeLine]?.trim();
  const jumpDestination =
    activeCommand?.startsWith('JUMP ') && instructionProgress >= 0.5
      ? rows.find((row) => row.command === `POSITION ${activeCommand.slice(5)}`)?.line
      : undefined;
  // Structural delimiters have no tile; retain a visible anchor instead of blinking out.
  const visibleActiveLine =
    ['END', 'ELSE'].includes(activeCommand ?? '') && !rows.some((row) => row.line === activeLine)
      ? (rows.findLast((row) => row.line < activeLine)?.line ?? activeLine)
      : activeLine;
  const markerLine = jumpDestination ?? visibleActiveLine;
  return { tree, rows, elseBlock, visibleFailureLine, markerLine, inLoop: (line: number) => insideOrderLoop(source, line) };
}
