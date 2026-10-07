import { Captions } from 'lucide-react';
import { useId } from 'react';
import { useUntranslated, useWords } from '@/shared/language';
import { ROUTE_WORDS } from './routeWords';
import type { ServiceSummary as Summary, SummaryLine } from './serviceWords';
import { SUMMARY_WORDS } from './summaryWords';

function Lines({ title, lines, empty }: { title: string; lines: readonly SummaryLine[]; empty?: string }) {
  const heading = useId();
  const english = useUntranslated();
  return (
    <section aria-labelledby={heading}>
      <h4 id={heading}>{title}</h4>
      {lines.length ? (
        <ul>
          {lines.map((line, i) => (
            <li key={i}>
              <strong>
                {line.who}
                {line.said !== undefined && (
                  <>
                    {' · “'}
                    <span lang={english}>{line.said}</span>”
                  </>
                )}
              </strong>
              <span>{line.what}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="service-summary-empty">{empty}</p>
      )}
    </section>
  );
}

/**
 * The café in words, over the scene while the service plays or is looked back on: the guests and how each order
 * stands, what each robot is doing and carrying, what waits on the counters, and what stopped the run. It changes as
 * the run does without speaking; what happens is said by the workspace's own announcements, a little at a time.
 */
export function ServiceSummary({ summary, when }: { summary: Summary; when: string }) {
  const say = useWords(SUMMARY_WORDS);
  const stopped = useWords(ROUTE_WORDS).stopped;
  const english = useUntranslated();
  return (
    <section className="service-summary" aria-label={say.title}>
      <h3>
        <Captions size={14} aria-hidden="true" />
        {say.title}
        <span>{when}</span>
      </h3>
      {summary.stopped && (
        <p className="service-summary-stopped">
          {stopped(summary.stopped.who)}
          <span lang={english}>{summary.stopped.error}</span>.
        </p>
      )}
      <Lines title={say.guests(summary.served, summary.total)} lines={summary.guests} empty={say.nobody} />
      <Lines title={say.crew} lines={summary.crew} />
      <Lines title={say.counters} lines={summary.counters} />
    </section>
  );
}
