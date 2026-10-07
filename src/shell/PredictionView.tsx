import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, CircleCheck, CircleX } from 'lucide-react';
import { BlockLines, spokenLines } from '@/components';
import { momentOf, type Prediction } from '@/data/predictions';
import { ROBOT_DISPLAY_NAMES, variableLabels } from '@/domain';
import { CARGO_WORDS } from '@/components/cargoWords';
import { useUntranslated, useWords } from '@/shared/language';
import { useNarrative } from '@/state/GameStore';
import { DRILL_WORDS } from './drillWords';

const letter = (i: number) => String.fromCharCode(65 + i);

/**
 * A moment paused in a served shift: what the guest said, what the robot holds and remembers, and its routine with the
 * block it has just run. The player calls the next block from a few, lettered in the routine too, and the café plays
 * on: the block that really ran next is marked, with why. One call a visit, so the answer can't be found by elimination.
 */
export function PredictionView({
  prediction,
  onBack,
  onDone,
}: {
  prediction: Prediction;
  onBack: () => void;
  /** The call was right: the moment is done. */
  onDone: () => void;
}) {
  const moment = useMemo(() => momentOf(prediction), [prediction]);
  const say = useWords(DRILL_WORDS);
  const { held: heldLabel, paper: paperLabel, place: placeLabel } = useWords(CARGO_WORDS);
  const english = useUntranslated();
  const narrative = useNarrative();
  const [picked, setPicked] = useState<number>();
  const question = useRef<HTMLParagraphElement>(null);
  const routine = useRef<HTMLDivElement>(null);
  useEffect(() => {
    question.current?.focus();
    // The block just run is where the eye starts, so a long routine opens scrolled to it.
    const box = routine.current,
      ran = box?.querySelector<HTMLElement>('.block-line.ran');
    if (box && ran) box.scrollTop = Math.max(0, ran.offsetTop - box.clientHeight / 2);
  }, []);
  const robot = ROBOT_DISPLAY_NAMES[prediction.robot];
  const { paused, next } = moment;
  const revealed = picked !== undefined;
  const lettered = new Map(prediction.choices.map((line, i) => [line, letter(i)]));
  const lines = moment.lines.map((line) => {
    const tone =
      line.line === prediction.after
        ? 'ran'
        : revealed && line.line === next
          ? 'next'
          : revealed && line.line === picked
            ? 'missed'
            : undefined;
    const marks = [
      line.line === prediction.after && say.next.justRan,
      lettered.get(line.line),
      revealed && line.line === next && say.next.ranNext,
    ].filter(Boolean);
    return { ...line, tone, mark: marks.join(' · ') || undefined };
  });
  const lineAt = (at: number) => moment.lines.find((line) => line.line === at)!;
  const memory = Object.entries(paused.variables ?? {}).filter(([, value]) => value !== undefined);
  const held = [...(paused.heldPaper ? [paperLabel(paused.heldPaper)] : []), ...paused.inventory.map(heldLabel)];
  const call = (line: number) => {
    if (revealed) return;
    setPicked(line);
    if (line === next) onDone();
  };
  return (
    <div className="drill">
      <button className="drill-back" onClick={onBack}>
        <ArrowLeft size={15} aria-hidden="true" /> {say.back}
      </button>
      <p className="drill-question" tabIndex={-1} ref={question}>
        {say.next.question(robot)}
      </p>
      <dl className="prediction-moment">
        <div>
          <dt>{say.next.says}</dt>
          <dd>
            “<span lang={english}>{moment.phrase}</span>”
          </dd>
        </div>
        {held.length > 0 && (
          <div>
            <dt>{say.next.holds(robot)}</dt>
            <dd>{held.join('; ')}</dd>
          </div>
        )}
        {memory.length > 0 && (
          <div>
            <dt>{say.next.remembers(robot)}</dt>
            <dd>
              {memory
                .map(
                  ([variable, value]) =>
                    `${variableLabels(variable)} = ${typeof value === 'number' ? value : placeLabel(value!)}`,
                )
                .join(', ')}
            </dd>
          </div>
        )}
      </dl>
      <figure className="drill-routine">
        <figcaption>
          {say.routine(robot, prediction.shift)}
          {narrative[prediction.shift - 1].title}
        </figcaption>
        <div className="prediction-routine" ref={routine}>
          <BlockLines lines={lines} />
        </div>
      </figure>
      <ul className="drill-choices" aria-label={say.blocks}>
        {prediction.choices.map((line, i) => {
          const block = { ...lineAt(line), depth: 0 };
          return (
            <li key={line}>
              <button
                className="drill-choice prediction-choice"
                aria-pressed={picked === line}
                aria-disabled={revealed || undefined}
                aria-label={say.next.choice(letter(i), spokenLines([block]))}
                onClick={() => call(line)}
              >
                <span className="prediction-letter" aria-hidden="true">
                  {letter(i)}
                </span>
                <BlockLines lines={[block]} />
              </button>
            </li>
          );
        })}
      </ul>
      <div className={`drill-verdict ${revealed ? (picked === next ? 'served' : 'turned') : ''}`} role="status">
        {revealed && picked === next ? (
          <>
            <CircleCheck size={18} aria-hidden="true" />
            <p>
              <strong>{say.next.calledIt}</strong> <span lang={english}>{prediction.why}</span>
            </p>
          </>
        ) : revealed ? (
          <>
            <CircleX size={18} aria-hidden="true" />
            <p>
              <strong>{say.next.notThisTime}</strong>{' '}
              {say.next.ran(robot, lettered.get(next)!, spokenLines([lineAt(next)]))}{' '}
              <span lang={english}>{prediction.why}</span>
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}
