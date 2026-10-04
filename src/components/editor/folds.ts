import { groupEnd, isOpening } from '@/domain';

/**
 * Folded groups, by the line each opens on, carried across an edit. A group whose blocks are all unchanged keeps its
 * fold wherever it went: an edit above it, a neighbour moved past it, or the group itself dragged or moved. One whose
 * hidden blocks changed opens, so a change is never made out of sight. A new value on the group's own first block,
 * which stays in view, leaves it folded.
 */
export function carryFolds(before: string, after: string, folded: ReadonlySet<number>): Set<number> {
  const a = before.split('\n').map((l) => l.trim()),
    b = after.split('\n').map((l) => l.trim());
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let same = 0;
  while (same < a.length - start && same < b.length - start && a[a.length - 1 - same] === b[b.length - 1 - same])
    same++;
  const onlyLine = a.length - same - start === 1 && b.length === a.length && isOpening(b[start]);
  const carried = new Set<number>();
  for (const line of folded) {
    if (!isOpening(a[line] ?? '')) continue;
    if (onlyLine && line === start) {
      carried.add(line);
      continue;
    }
    const group = a.slice(line, groupEnd(a, line) + 1);
    // Where it would be if it didn't move, to choose between copies of the same group.
    const expected = line >= a.length - same ? line + b.length - a.length : line;
    const found = b
      .map((_, i) => i)
      .filter((i) => group.every((l, k) => b[i + k] === l))
      .sort((x, y) => Math.abs(x - expected) - Math.abs(y - expected))[0];
    if (found !== undefined) carried.add(found);
  }
  return carried;
}
