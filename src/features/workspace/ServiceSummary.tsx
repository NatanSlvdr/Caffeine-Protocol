import { Captions } from 'lucide-react';
import { useId } from 'react';
import type { ServiceSummary as Summary, SummaryLine } from './serviceWords';

function Lines({ title, lines, empty }: { title: string; lines: readonly SummaryLine[]; empty?: string }) {
  const heading = useId();
  return (
    <section aria-labelledby={heading}>
      <h4 id={heading}>{title}</h4>
      {lines.length ? (
        <ul>
          {lines.map((line, i) => (
            <li key={i}>
              <strong>{line.who}</strong>
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
  return (
    <section className="service-summary" aria-label="The café in words">
      <h3>
        <Captions size={14} aria-hidden="true" />
        The café in words
        <span>{when}</span>
      </h3>
      {summary.stopped && <p className="service-summary-stopped">{summary.stopped}</p>}
      <Lines
        title={`Guests · ${summary.served} of ${summary.total} served`}
        lines={summary.guests}
        empty="No one in the café just now."
      />
      <Lines title="Crew" lines={summary.crew} />
      <Lines title="Counters" lines={summary.counters} />
    </section>
  );
}
