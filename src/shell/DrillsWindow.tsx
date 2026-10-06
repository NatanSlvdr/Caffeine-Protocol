import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowLeft, Check, CircleCheck, CircleX } from 'lucide-react';
import { BlockLines, Modal, spokenLines } from '@/components';
import { titleFor } from '@/data';
import { drillLines, tryDrill, type Drill } from '@/data/drills';
import type { Prediction } from '@/data/predictions';
import { ROBOT_DISPLAY_NAMES, count } from '@/domain';
import { useCafeName } from '@/state/GameStore';
import { PredictionView } from './PredictionView';
import { acts } from './rail/acts';

/** How many lines of the routine show on each side of the gap. */
const CONTEXT = 3;

/** Either kind of drill: a gap to fill, or a paused moment to call. */
type Entry = { kind: 'gap'; item: Drill } | { kind: 'next'; item: Prediction };
const KIND: Record<Entry['kind'], string> = { gap: 'Fill the gap', next: 'What runs next' };

/**
 * Drills, away from the rail: each one on an idea a shift taught, open once that shift is served, so it never gives a
 * shift's answer away early. Two kinds: fill the gap in a worked example, or call which block runs next in a moment
 * paused from one. Either way the café plays the pick out. A drill got right on the first pick is ticked as done,
 * kept with the café but apart from its stars; the rest can be tried as often as they help.
 */
export function DrillsWindow({
  drills,
  predictions,
  waiting,
  fresh = [],
  done = [],
  onDone,
  onClose,
}: {
  /** The gap drills on shifts already served, in campaign order. */
  drills: readonly Drill[];
  /** The moments to call on shifts already served, in campaign order. */
  predictions: readonly Prediction[];
  /** How many of either are still to come, on shifts not served yet. */
  waiting: number;
  /** The drills that weren't there when the drills were last opened. */
  fresh?: readonly string[];
  /** The drills already got right on a first pick. */
  done?: readonly string[];
  /** A drill was just got right on the first pick. */
  onDone: (id: string) => void;
  onClose: () => void;
}) {
  const cafe = useCafeName();
  const [entry, setEntry] = useState<Entry>();
  // Back from a drill, its own line in the list takes focus again, where the player left off.
  const [left, setLeft] = useState<string>();
  const entries: Entry[] = [
    ...drills.map((item) => ({ kind: 'gap' as const, item })),
    ...predictions.map((item) => ({ kind: 'next' as const, item })),
  ].sort((a, b) => a.item.shift - b.item.shift);
  const back = () => {
    setLeft(entry?.item.id);
    setEntry(undefined);
  };
  const finished = (id: string) => () => {
    if (!done.includes(id)) onDone(id);
  };
  const ticked = done.filter((id) => entries.some((each) => each.item.id === id)).length;
  return (
    <Modal
      className="settings-window drills-window"
      kicker={`${cafe} · Away from the rail`}
      title={entry ? entry.item.title : 'Drills.'}
      onClose={onClose}
      wide
    >
      {entry?.kind === 'gap' ? (
        <DrillView key={entry.item.id} drill={entry.item} onBack={back} onDone={finished(entry.item.id)} />
      ) : entry?.kind === 'next' ? (
        <PredictionView key={entry.item.id} prediction={entry.item} onBack={back} onDone={finished(entry.item.id)} />
      ) : (
        <>
          <p className="drills-intro">
            One idea from a served shift at a time: fill the gap in a routine, or call which block runs next, and the
            café plays it out. A drill got right on the first pick is ticked; none of it counts toward stars.
          </p>
          {acts.map((act) => {
            const here = entries.filter((each) => each.item.shift - 1 >= act.from && each.item.shift - 1 < act.to);
            if (!here.length) return null;
            return (
              <section key={act.kicker} className="drills-act" aria-label={`${act.kicker}, ${act.crew}`}>
                <h3>
                  {act.kicker} · {act.crew}
                </h3>
                <ul>
                  {here.map((each) => {
                    const { id, title, shift, robot } = each.item;
                    return (
                      <li key={id}>
                        <button
                          className={`drills-pick${done.includes(id) ? ' done' : ''}`}
                          autoFocus={id === left}
                          data-autofocus={each === entries[0] || undefined}
                          onClick={() => setEntry(each)}
                        >
                          <strong>
                            {title}
                            {done.includes(id) && (
                              <span className="drills-done">
                                <Check size={14} strokeWidth={3} aria-hidden="true" />
                                <span className="sr-only">, done</span>
                              </span>
                            )}
                          </strong>
                          <small>
                            {KIND[each.kind]} · Shift {shift} · {titleFor(shift - 1)} · {ROBOT_DISPLAY_NAMES[robot]}
                            {fresh.includes(id) && <span className="drills-new"> · New</span>}
                          </small>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
          <p className="drills-waiting">
            {ticked} of {count(entries.length, 'drill')} done.
            {waiting > 0 &&
              ` ${count(waiting, 'more drill')} ${waiting === 1 ? 'opens' : 'open'} as later shifts are served.`}
          </p>
        </>
      )}
    </Modal>
  );
}

/** One drill: the routine around its gap, the passages to fill it with, and what the café made of the last pick. */
function DrillView({ drill, onBack, onDone }: { drill: Drill; onBack: () => void; onDone: () => void }) {
  const [picked, setPicked] = useState<string>();
  const [verdict, setVerdict] = useState<{ served: boolean; reason?: string }>();
  // Opening a drill takes its button away, so the question takes focus and is what's read first.
  const question = useRef<HTMLParagraphElement>(null);
  useEffect(() => question.current?.focus(), []);
  const worked = drillLines(drill);
  const above = worked.before.slice(-CONTEXT),
    below = worked.after.slice(0, CONTEXT);
  const base = Math.min(...[...above, ...worked.gap, ...below].map((line) => line.depth));
  const gapDepth = worked.gap[0].depth;
  const pick = (choice: string) => {
    const result = tryDrill(drill, choice);
    // Only the first pick of a visit can tick it: after a miss, the answer is one of fewer.
    if (picked === undefined && result.passed) onDone();
    setPicked(choice);
    setVerdict({ served: result.passed, reason: result.first_failure?.reason });
  };
  const robot = ROBOT_DISPLAY_NAMES[drill.robot];
  return (
    <div className="drill">
      <button className="drill-back" onClick={onBack}>
        <ArrowLeft size={15} aria-hidden="true" /> All drills
      </button>
      <p className="drill-question" tabIndex={-1} ref={question}>
        {drill.question}
      </p>
      <figure className="drill-routine">
        <figcaption>
          {robot}’s routine on Shift {drill.shift}, {titleFor(drill.shift - 1)}
        </figcaption>
        {worked.before.length > above.length && <span className="drill-more" aria-hidden="true" />}
        <BlockLines lines={above} base={base} />
        {picked === undefined ? (
          <span className="drill-gap" style={{ '--depth': gapDepth - base } as CSSProperties}>
            <span aria-hidden="true">?</span>
            <span className="sr-only">The gap</span>
          </span>
        ) : (
          <BlockLines className="drill-filled" lines={drillLines(drill, picked).gap} base={base} />
        )}
        <BlockLines lines={below} base={base} />
        {worked.after.length > below.length && <span className="drill-more" aria-hidden="true" />}
      </figure>
      <ul className="drill-choices" aria-label="Passages">
        {drill.choices.map((choice) => {
          const lines = drillLines(drill, choice).gap;
          return (
            <li key={choice}>
              <button
                className="drill-choice"
                aria-pressed={picked === choice}
                aria-label={spokenLines(lines)}
                onClick={() => pick(choice)}
              >
                <BlockLines lines={lines} base={gapDepth} />
              </button>
            </li>
          );
        })}
      </ul>
      <div className={`drill-verdict ${verdict ? (verdict.served ? 'served' : 'turned') : ''}`} role="status">
        {verdict?.served ? (
          <>
            <CircleCheck size={18} aria-hidden="true" />
            <p>
              <strong>Served.</strong> {drill.idea}
            </p>
          </>
        ) : verdict ? (
          <>
            <CircleX size={18} aria-hidden="true" />
            <p>
              <strong>Not served.</strong> {verdict.reason} Try another passage.
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}
