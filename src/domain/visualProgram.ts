import { cleanAlternatives, elseLine, groupEnd, isOpening } from './scope';

export interface VisualBlock {
  line: number;
  command: string;
  end: number;
  children?: VisualBlock[];
  alternative?: VisualBlock[];
  elseLine?: number;
}

/** Remove a scope; also prune jump markers left without a matching destination. */
function removeScope(lines: string[], from: number): string[] {
  const removed = lines.splice(from, groupEnd(lines, from) - from + 1).map((c) => c.trim());
  const removedTargets = removed.filter((c) => c.startsWith('POSITION ')).map((c) => c.slice(9));
  const removedJumps = removed.filter((c) => c.startsWith('JUMP ')).map((c) => c.slice(5));
  return pruneOrphanJumps(lines, removedTargets, removedJumps);
}

function pruneOrphanJumps(lines: string[], removedTargets: string[], removedJumps: string[]): string[] {
  return lines.filter((raw) => {
    const c = raw.trim();
    return (
      !(c.startsWith('JUMP ') && removedTargets.includes(c.slice(5))) &&
      !(
        c.startsWith('POSITION ') &&
        removedJumps.includes(c.slice(9)) &&
        !lines.some((l) => l.trim() === 'JUMP ' + c.slice(9))
      )
    );
  });
}

/** Dropping a scope outside the canvas removes its body and any now-unconnected jump markers. */
export function removeVisualBlock(source: string, from: number) {
  const lines = source.split('\n');
  if (from < 0 || from >= lines.length) return source;
  return cleanAlternatives(removeScope(lines, from)).join('\n');
}

/** Source line identities remain intact so execution highlighting and comments survive the visual view. */
export function visualProgram(source: string): VisualBlock[] {
  const lines = source.split('\n');
  function readRange(start: number, stop: number): VisualBlock[] {
    const blocks: VisualBlock[] = [];
    for (let line = start; line < stop; line++) {
      const command = lines[line].trim();
      if (!command || command.startsWith('#') || command === 'END' || command === 'ELSE') continue;
      const end = isOpening(command) ? groupEnd(lines, line) : line;
      const block: VisualBlock = { line, command, end };
      if (isOpening(command)) {
        const alternative = elseLine(lines, line, end);
        block.children = readRange(line + 1, alternative ?? end);
        block.elseLine = alternative;
        if (alternative !== undefined) block.alternative = readRange(alternative + 1, end);
      }
      blocks.push(block);
      line = end;
    }
    return blocks;
  }
  return readRange(0, lines.length);
}

/** The code pane's rows in order, as the lines they start on, Else rows included, each with the block it shows. */
function paneRows(source: string): { line: number; block: VisualBlock }[] {
  const flatten = (blocks: VisualBlock[]): { line: number; block: VisualBlock }[] =>
    blocks.flatMap((block) => [
      { line: block.line, block },
      ...flatten(block.children ?? []),
      ...(block.alternative?.length ? [{ line: block.elseLine!, block }, ...flatten(block.alternative)] : []),
    ]);
  return flatten(visualProgram(source));
}

/** A block's number in the code pane, counted as the pane counts them, Else rows included; 0 for a line it hides. */
export function blockOrdinal(source: string, line: number): number {
  return paneRows(source).findIndex((row) => row.line === line) + 1;
}

/**
 * The code pane's row for a line of the routine: the line's own, or for an End, which the pane draws as the bottom of
 * a group, the row of the block that opens it. Nothing for a line the pane leaves out, such as a comment.
 */
export function paneRow(
  source: string,
  line: number,
): { ordinal: number; block: VisualBlock; closes: boolean } | undefined {
  const rows = paneRows(source);
  const own = rows.findIndex((row) => row.line === line);
  if (own >= 0) return { ordinal: own + 1, block: rows[own].block, closes: false };
  const opener = rows.findIndex(
    (row) => row.line === row.block.line && row.block.end === line && row.block.end > row.line,
  );
  return opener >= 0 ? { ordinal: opener + 1, block: rows[opener].block, closes: true } : undefined;
}

/**
 * Whether a run can stop as a line's block starts: any block the pane shows but an Else, a jump's landing spot or a
 * function's name, which only say where the routine goes and never start anything themselves.
 */
export function canPauseAt(source: string, line: number): boolean {
  return (
    paneRows(source).some((row) => row.line === line) &&
    !/^(ELSE|POSITION|FUNCTION)\b/.test(source.split('\n')[line]?.trim() ?? '')
  );
}

/** Deduplicate a repeated jump command by allocating a fresh destination label. */
function dedupeJump(lines: string[], command: string): string {
  if (command.startsWith('JUMP ') && lines.some((l) => l.trim() === command)) {
    let n = 1;
    while (lines.some((l) => l.trim() === 'POSITION jump_' + n)) n++;
    return 'JUMP jump_' + n;
  }
  return command;
}

/** Extract the moved scope body and its pre-move end, or wrap a fresh command with its closing delimiter. */
function extractMove(lines: string[], command: string, from?: number): { content: string[]; end: number } {
  if (from === undefined) return { content: [command, ...(isOpening(command) ? ['END'] : [])], end: -1 };
  const end = groupEnd(lines, from);
  return { content: lines.splice(from, end - from + 1), end };
}

/** Every jump destination needs a matching position marker at the top of the program. */
function ensurePosition(lines: string[], command: string): void {
  if (command.startsWith('JUMP ') && !lines.some((l) => l.trim() === 'POSITION ' + command.slice(5)))
    lines.unshift('POSITION ' + command.slice(5));
}

/** Insert/move an entire scope; an ELSE only exists once it contains an instruction. */
export function placeBlock(source: string, command: string, at: number, from?: number, alternative = false) {
  const lines = source ? source.split('\n') : [];
  // An ELSE can only attach to another IF's optional alternative slot.
  if (command === 'ELSE' && !alternative) return source;
  // Distinguish a move of an existing scope (identified by its source line) from a library insert
  // before dedup runs. A move must preserve its JUMP destination exactly; only a genuinely new
  // JUMP (no source identity) may allocate a fresh POSITION.
  const isMove = from !== undefined;
  if (!isMove) command = dedupeJump(lines, command);
  let adjusted = at;
  const { content, end } = extractMove(lines, command, from);
  if (from !== undefined) {
    if (at >= from && at <= end) return source;
    if (adjusted > end) adjusted -= content.length;
  }
  lines.splice(adjusted, 0, ...(alternative && command !== 'ELSE' ? ['ELSE'] : []), ...content);
  const kept = cleanAlternatives(lines);
  ensurePosition(kept, command);
  return kept.join('\n');
}
