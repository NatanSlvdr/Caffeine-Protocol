import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowLeft, CircleCheck, CircleX } from 'lucide-react';
import { BlockLines, Modal, spokenLines } from '@/components';
import { titleFor } from '@/data';
import { drillLines, tryDrill, type Drill } from '@/data/drills';
import { ROBOT_DISPLAY_NAMES, count } from '@/domain';
import { useCafeName } from '@/state/GameStore';
import { acts } from './rail/acts';

/** How many lines of the routine show on each side of the gap. */
const CONTEXT = 3;

/**
 * Drills, away from the rail: each one on an idea a shift taught, open once that shift is served, so it never gives a
 * shift's answer away early. Nothing in it is kept and nothing it does counts, so a drill can be tried as often as it
 * helps.
 */
export function DrillsWindow({
  open,
  waiting,
  fresh = [],
  onClose,
}: {
  /** The drills on shifts already served, in campaign order. */
  open: readonly Drill[];
  /** How many are still to come, on shifts not served yet. */
  waiting: number;
  /** The drills that weren't there when the drills were last opened. */
  fresh?: readonly string[];
  onClose: () => void;
}) {
  const cafe = useCafeName();
  const [drill, setDrill] = useState<Drill>();
  // Back from a drill, its own line in the list takes focus again, where the player left off.
  const [left, setLeft] = useState<string>();
  return (
    <Modal
      className="settings-window drills-window"
      kicker={`${cafe} · Away from the rail`}
      title={drill ? drill.title : 'Drills.'}
      onClose={onClose}
      wide
    >
      {drill ? (
        <DrillView
          key={drill.id}
          drill={drill}
          onBack={() => {
            setLeft(drill.id);
            setDrill(undefined);
          }}
        />
      ) : (
        <>
          <p className="drills-intro">
            One idea from a served shift at a time: pick the passage that fills the gap in its routine, and the café
            serves the shift with it. Nothing here is kept or counted.
          </p>
          {acts.map((act) => {
            const here = open.filter((each) => each.shift - 1 >= act.from && each.shift - 1 < act.to);
            if (!here.length) return null;
            return (
              <section key={act.kicker} className="drills-act" aria-label={`${act.kicker}, ${act.crew}`}>
                <h3>
                  {act.kicker} · {act.crew}
                </h3>
                <ul>
                  {here.map((each) => (
                    <li key={each.id}>
                      <button
                        className="drills-pick"
                        autoFocus={each.id === left}
                        data-autofocus={each === open[0] || undefined}
                        onClick={() => setDrill(each)}
                      >
                        <strong>{each.title}</strong>
                        <small>
                          Shift {each.shift} · {titleFor(each.shift - 1)} · {ROBOT_DISPLAY_NAMES[each.robot]}
                          {fresh.includes(each.id) && <span className="drills-new"> · New</span>}
                        </small>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
          {waiting > 0 && (
            <p className="drills-waiting">
              {count(waiting, 'more drill')} {waiting === 1 ? 'opens' : 'open'} as later shifts are served.
            </p>
          )}
        </>
      )}
    </Modal>
  );
}

/** One drill: the routine around its gap, the passages to fill it with, and what the café made of the last pick. */
function DrillView({ drill, onBack }: { drill: Drill; onBack: () => void }) {
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
