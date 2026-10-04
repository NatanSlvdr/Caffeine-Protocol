import { isOpening } from '@/domain';

/**
 * The innermost If, For or Function around a line of the text view, as the lines that open it, branch it with Else
 * and close it with End. A group that isn't closed yet has no edges to match, so it gives nothing.
 */
export function scopeAround(lines: readonly string[], line: number): number[] {
  const open: { at: number; branch?: number }[] = [];
  for (const [i, text] of lines.entries()) {
    const command = text.trim();
    if (isOpening(command)) open.push({ at: i });
    else if (command === 'ELSE' && open.length) open[open.length - 1].branch = i;
    else if (command === 'END') {
      const group = open.pop();
      // Groups close inside out, so the first closed around the line is the innermost.
      if (group && group.at <= line && line <= i)
        return [group.at, ...(group.branch === undefined ? [] : [group.branch]), i];
    }
  }
  return [];
}
