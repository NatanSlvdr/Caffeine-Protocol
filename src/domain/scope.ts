/** A scope opens a body closed by a later END delimiter. */
export const isOpening = (command: string) =>
  command.startsWith('FOR ') || command.startsWith('IF ') || command.startsWith('FUNCTION ');

/** Locate the closing source delimiter of the scope opening at `from`, including nested scopes. */
export function groupEnd(lines: string[], from: number): number {
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

/** Stack of enclosing opening commands above a source row, outermost first. */
export function enclosingScope(source: string, line: number): string[] {
  const stack: string[] = [];
  for (const raw of source.split('\n').slice(0, line)) {
    const command = raw.trim();
    if (isOpening(command)) stack.push(command);
    else if (command === 'END') stack.pop();
  }
  return stack;
}

/** Whether a source row belongs to a scope opened by `prefix`, including nested IF branches. */
export function insideScope(source: string, line: number, prefix: string): boolean {
  return enclosingScope(source, line).some((command) => command.startsWith(prefix));
}

/** Locate the ELSE delimiter of the scope opening at `from`, if it has an alternative. */
export function elseLine(lines: string[], from: number, end: number): number | undefined {
  for (let i = from + 1; i < end; i++) {
    if (lines[i].trim() === 'ELSE') return i;
    if (isOpening(lines[i].trim())) i = groupEnd(lines, i);
  }
  return undefined;
}

/** Drop empty alternatives without mutating the input lines. */
export function cleanAlternatives(lines: string[]): string[] {
  const kept = [...lines];
  for (let i = kept.length - 1; i >= 0; i--) {
    if (kept[i].trim() !== 'ELSE') continue;
    const next = kept.slice(i + 1).find((l) => l.trim() && !l.trim().startsWith('#'));
    if (next?.trim() === 'END') kept.splice(i, 1);
  }
  return kept;
}
