import { isOpening } from './program';

/** Locate the closing source delimiter, including nested scopes. */
function groupEnd(lines: string[], from: number) {
  let end = from;
  const alternative = lines[from].trim() === 'ELSE';
  if (isOpening(lines[from].trim()) || alternative) {
    let depth = 1;
    while (end + 1 < lines.length && depth) {
      const command = lines[++end].trim();
      if (isOpening(command)) depth++;
      if (command === 'END') depth--;
    }
    if (alternative && lines[end].trim() === 'END') end--;
  }
  return end;
}

function cleanAlternatives(lines: string[]) {
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].trim() !== 'ELSE') continue;
    const next = lines.slice(i + 1).find(l => l.trim() && !l.trim().startsWith('#'));
    if (next?.trim() === 'END') lines.splice(i, 1);
  }
  return lines;
}

/** Dropping a scope outside the canvas removes its body and any now-unconnected jump markers. */
export function removeVisualBlock(source: string, from: number) {
  const lines = source.split('\n');
  if (from < 0 || from >= lines.length) return source;
  const removed = lines.splice(from, groupEnd(lines, from) - from + 1).map(c => c.trim());
  const removedTargets = removed.filter(c => c.startsWith('POSITION ')).map(c => c.slice(9));
  const removedJumps = removed.filter(c => c.startsWith('JUMP ')).map(c => c.slice(5));
  return cleanAlternatives(lines.filter(raw => {
    const c = raw.trim();
    return !(c.startsWith('JUMP ') && removedTargets.includes(c.slice(5))) &&
      !(c.startsWith('POSITION ') && removedJumps.includes(c.slice(9)) && !lines.some(l => l.trim() === 'JUMP ' + c.slice(9)));
  })).join('\n');
}

export interface VisualBlock { line: number; command: string; end: number; children?: VisualBlock[]; alternative?: VisualBlock[]; elseLine?: number }
/** Source line identities remain intact so execution highlighting and comments survive the visual view. */
export function visualProgram(source: string): VisualBlock[] {
  const lines = source.split('\n');
  function read(start: number, stop: number): VisualBlock[] {
    const blocks: VisualBlock[] = [];
    for (let line = start; line < stop; line++) {
      const command = lines[line].trim();
      if (!command || command.startsWith('#') || command === 'END' || command === 'ELSE') continue;
      const end = isOpening(command) ? groupEnd(lines, line) : line;
      const block: VisualBlock = { line, command, end };
      if (isOpening(command)) {
        let elseLine: number | undefined;
        for (let i = line + 1; i < end; i++) {
          if (lines[i].trim() === 'ELSE') { elseLine = i; break; }
          if (isOpening(lines[i].trim())) i = groupEnd(lines, i);
        }
        block.children = read(line + 1, elseLine ?? end);
        block.elseLine = elseLine;
        if (elseLine !== undefined) block.alternative = read(elseLine + 1, end);
      }
      blocks.push(block); line = end;
    }
    return blocks;
  }
  return read(0, lines.length);
}

/** Insert/move an entire scope; an ELSE only exists once it contains an instruction. */
export function placeBlock(source: string, command: string, at: number, from?: number, alternative = false) {
  const lines = source ? source.split('\n') : [];
  // An ELSE can only attach to another IF's optional alternative slot.
  if (command === 'ELSE' && !alternative) return source;
  if (from === undefined && command.startsWith('JUMP ') && lines.some(l => l.trim() === command)) {
    let n = 1;
    while (lines.some(l => l.trim() === 'POSITION jump_' + n)) n++;
    command = 'JUMP jump_' + n;
  }
  let content = [command, ...(isOpening(command) ? ['END'] : [])];
  if (from !== undefined) {
    const end = groupEnd(lines, from);
    if (at >= from && at <= end) return source;
    content = lines.splice(from, end - from + 1);
    if (at > end) at -= content.length;
  }
  lines.splice(at, 0, ...(alternative && command !== 'ELSE' ? ['ELSE'] : []), ...content);
  cleanAlternatives(lines);
  if (command.startsWith('JUMP ') && !lines.some(l => l.trim() === 'POSITION ' + command.slice(5))) lines.unshift('POSITION ' + command.slice(5));
  return lines.join('\n');
}
