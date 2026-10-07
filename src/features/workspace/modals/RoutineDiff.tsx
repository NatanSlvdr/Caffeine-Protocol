import { useId } from 'react';
import { indentSource } from '@/domain';
import { useWords } from '@/shared/language';
import { lineDiff } from '../versions';
import { OPTIONS_WORDS } from './optionsWords';

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
  const say = useWords(OPTIONS_WORDS).diff;
  const heading = useId();
  return (
    <section className="restore-compare" aria-labelledby={heading}>
      <p id={heading} className="restore-compare-title">
        {say.heading(robot)}
        <span>
          {[added && say.change(added, brings), removed && say.change(removed, 'out')].filter(Boolean).join(' · ') ||
            say.spacing}
        </span>
      </p>
      <ol className="restore-diff">
        {diff.map((line, i) => (
          <li key={i} className={line.kind}>
            <span className="restore-diff-mark" aria-hidden="true">
              {line.kind === 'add' ? '+' : line.kind === 'remove' ? '−' : ''}
            </span>
            {line.kind !== 'same' && <span className="sr-only">{say.mark(line.kind === 'add' ? brings : 'out')}</span>}
            <code>{line.text}</code>
          </li>
        ))}
      </ol>
    </section>
  );
}
