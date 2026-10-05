import { useId } from 'react';
import { indentSource } from '@/domain';
import { lineDiff } from '../versions';

const count = (n: number, block: string) => `${n} ${block}${n === 1 ? '' : 's'}`;

/**
 * What putting another routine in place of the open one would change, line by line: the lines it brings `in` (or
 * back) and the ones that go out.
 */
export function RoutineDiff({
  robot,
  current,
  next,
  brings = 'back',
}: {
  robot: string;
  current: string;
  next: string;
  brings?: 'back' | 'in';
}) {
  const diff = lineDiff(indentSource(current), indentSource(next));
  const added = diff.filter((line) => line.kind === 'add').length,
    removed = diff.filter((line) => line.kind === 'remove').length;
  const heading = useId();
  const word = brings === 'back' ? 'Back' : 'In';
  return (
    <section className="restore-compare" aria-labelledby={heading}>
      <p id={heading} className="restore-compare-title">
        Against {robot}’s routine now
        <span>
          {[added && `${count(added, 'line')} ${brings}`, removed && `${count(removed, 'line')} out`]
            .filter(Boolean)
            .join(' · ') || 'Only the spacing differs'}
        </span>
      </p>
      <ol className="restore-diff">
        {diff.map((line, i) => (
          <li key={i} className={line.kind}>
            <span className="restore-diff-mark" aria-hidden="true">
              {line.kind === 'add' ? '+' : line.kind === 'remove' ? '−' : ''}
            </span>
            {line.kind !== 'same' && <span className="sr-only">{line.kind === 'add' ? `${word}: ` : 'Out: '}</span>}
            <code>{line.text}</code>
          </li>
        ))}
      </ol>
    </section>
  );
}
