import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Crosshair, MessageCircle } from 'lucide-react';
import { Modal } from '@/components';
import { Button } from '@/shared/ui/Button';
import {
  indentSource,
  ROBOT_DISPLAY_NAMES,
  type ChallengeMeasure,
  type LevelDefinition,
  type RobotPrograms,
  type RobotRole,
} from '@/domain';
import { RUN_MODIFIER, pad2 } from '@/shared/lib/format';
import type { ShiftBrief } from '../Workspace';
import type { RunEvidence } from '../evidence';
import { clueFor, HINT_TIERS, type Clue } from '../hints';
import { CHALLENGE_WORDS } from '../challenges';

export interface HelpModalProps {
  index: number;
  title: string;
  lesson: { note: string; solution: string; robotSolution?: RobotPrograms };
  brief: ShiftBrief;
  level: LevelDefinition;
  role: RobotRole;
  /** The open robot's routine as it stands, and as it was when the shift opened. */
  source: string;
  opening: string;
  observation: boolean;
  running: boolean;
  /** The shift's optional challenges met so far; nothing until it has been served, when they come to light. */
  challengesMet?: ChallengeMeasure[];
  /** How many hint tiers the player has asked for this shift: the last is the worked example. */
  hints: number;
  onHints: (hints: number) => void;
  /** The last failed run, for a clue that points at the robot that stopped. */
  evidence: RunEvidence | null;
  stale: boolean;
  /** Close the notes and put focus on the block a clue points at. */
  onShowClue: (show: NonNullable<Clue['show']>) => void;
  onUseExample: (source: string) => void;
  onReplayIntro: () => void;
  onClose: () => void;
}

/**
 * Shift field notes: lesson, goal, star targets, then hints the player asks for one at a time: the idea behind the
 * shift, a clue about where their routine needs work, and last the worked example, which only replaces their
 * routine when they say so.
 */
export function HelpModal({
  index,
  title,
  lesson,
  brief,
  level,
  role,
  source,
  opening,
  observation,
  running,
  challengesMet,
  hints,
  onHints,
  evidence,
  stale,
  onShowClue,
  onUseExample,
  onReplayIntro,
  onClose,
}: HelpModalProps) {
  const example = lesson.robotSolution?.[role] ?? lesson.solution;
  const robot = ROBOT_DISPLAY_NAMES[role];
  // The example replaces the routine wholesale, so the player's own edits get a second look first, and a reminder
  // that Undo brings them back. The opening routine needs none: Reset brings it back too.
  const edited = ![opening, example].some((kept) => kept.trim() === source.trim());
  // Already the routine: using it again would change nothing.
  const inUse = example.trim() === source.trim();
  const showSolution = hints >= HINT_TIERS.length;
  const clue = hints >= 2 ? clueFor(role, source, example, evidence, stale) : undefined;
  const [confirming, setConfirming] = useState(false);
  // Backing out of the warning puts focus back on the button that raised it, not on the page.
  const useButton = useRef<HTMLButtonElement>(null);
  const backingOut = useRef(false);
  // On a short screen the hints above can push a newly revealed example below the fold: bring it up to be read.
  const exampleRef = useRef<HTMLPreElement>(null);
  const revealing = useRef(false);
  useEffect(() => {
    if (!showSolution || !revealing.current) return;
    revealing.current = false;
    exampleRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, [showSolution]);
  useEffect(() => {
    if (confirming || !backingOut.current) return;
    backingOut.current = false;
    useButton.current?.focus();
  }, [confirming]);
  return (
    <Modal
      className="settings-window confirm-slip help-slip"
      kicker={`Shift ${pad2(index + 1)} · Field notes`}
      title={title}
      onClose={onClose}
    >
      <div className="lesson-note">{lesson.note}</div>
      <p>{brief.story}</p>
      <button
        className="settings-chip help-replay-intro"
        disabled={running}
        aria-describedby={running ? 'help-running' : undefined}
        onClick={onReplayIntro}
      >
        <MessageCircle size={14} aria-hidden="true" /> Replay the intro
      </button>
      {/* Greyed-out buttons say why: the café is mid-service. */}
      {running && (
        <p id="help-running" className="help-running">
          Stop the service to replay the intro{!observation && showSolution && !inUse ? ' or use the example' : ''}.
        </p>
      )}
      <p>
        <strong>Your goal:</strong> {brief.objective}
      </p>
      {!observation && (
        <>
          <dl className="help-targets">
            <div>
              <dt>
                <span aria-hidden="true">★</span>
                <span className="sr-only">One star</span>
              </dt>
              <dd>
                Every ticket correct<small>Every guest gets what they asked for</small>
              </dd>
            </div>
            <div>
              <dt>
                <span aria-hidden="true">★★</span>
                <span className="sr-only">Two stars</span>
              </dt>
              <dd>
                {level.block_target} blocks or fewer<small>A short routine is easy to change</small>
              </dd>
            </div>
            <div>
              <dt>
                <span aria-hidden="true">★★★</span>
                <span className="sr-only">Three stars</span>
              </dt>
              <dd>
                {level.instruction_target} steps or fewer<small>Every block run, by every robot</small>
              </dd>
            </div>
          </dl>
          {challengesMet && level.challenges && (
            <section className="help-challenges" aria-labelledby="help-challenges-lead">
              <p id="help-challenges-lead">Challenges · optional, for no stars</p>
              <ul>
                {level.challenges.map(({ measure, target }) => {
                  const words = CHALLENGE_WORDS[measure];
                  const met = challengesMet.includes(measure);
                  return (
                    <li key={measure} className={met ? 'met' : ''}>
                      <strong>{words.name}</strong>
                      {met && <span className="help-challenge-met"> · Met</span>}
                      <span className="help-challenge-goal">{words.goal(target)}</span>
                      <small>{words.note}</small>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
          {hints > 0 && (
            <ol className="help-hints" aria-label="Hints">
              <li>
                <span className="help-hint-label">{HINT_TIERS[0]}</span>
                <p>{brief.concept}</p>
              </li>
              {clue && (
                <li>
                  <span className="help-hint-label">{HINT_TIERS[1]}</span>
                  <p>{clue.text}</p>
                  {clue.show && (
                    <button className="settings-chip help-hint-show" onClick={() => onShowClue(clue.show!)}>
                      <Crosshair size={14} aria-hidden="true" /> Show this block
                    </button>
                  )}
                </li>
              )}
            </ol>
          )}
          {confirming ? (
            <>
              <p className="help-example-warning" role="alert">
                The example replaces {robot}’s routine. If you change your mind, Undo ({RUN_MODIFIER} Z) brings your
                version back.
              </p>
              <div className="modal-buttons help-example-actions">
                <button
                  className="settings-chip"
                  autoFocus
                  onClick={() => {
                    backingOut.current = true;
                    setConfirming(false);
                  }}
                >
                  Keep my edits
                </button>
                <Button variant="primary" disabled={running} onClick={() => onUseExample(example)}>
                  Replace my edits <ArrowRight size={15} aria-hidden="true" />
                </Button>
              </div>
            </>
          ) : (
            <div className="modal-buttons help-example-actions">
              {/* One button climbs the tiers; at the top it hides and shows the example, keeping the hints above. */}
              <button
                className="settings-chip"
                aria-expanded={hints >= HINT_TIERS.length - 1 ? showSolution : undefined}
                aria-controls={showSolution ? 'worked-example' : undefined}
                onClick={() => {
                  setConfirming(false);
                  revealing.current = hints === HINT_TIERS.length - 1;
                  onHints(showSolution ? hints - 1 : hints + 1);
                }}
              >
                {['Remind me of the idea', 'Give me a clue', 'Reveal worked example', 'Hide worked example'][hints]}
              </button>
              {showSolution &&
                (inUse ? (
                  <Button variant="primary" disabled>
                    Example in use
                  </Button>
                ) : (
                  <Button
                    ref={useButton}
                    variant="primary"
                    disabled={running}
                    aria-describedby={running ? 'help-running' : undefined}
                    onClick={() => (edited ? setConfirming(true) : onUseExample(example))}
                  >
                    Use this example <ArrowRight size={15} aria-hidden="true" />
                  </Button>
                ))}
              {!showSolution && (
                <span className="help-hint-count" aria-hidden="true">
                  {hints ? `${hints} of ${HINT_TIERS.length} hints` : 'Hints come one at a time'}
                </span>
              )}
            </div>
          )}
          {showSolution && (
            <>
              {lesson.robotSolution && (
                <p className="code-example-label">{robot}’s routine · the other robots keep theirs</p>
              )}
              <pre className="code-example" id="worked-example" ref={exampleRef}>
                {indentSource(example)}
              </pre>
            </>
          )}
        </>
      )}
    </Modal>
  );
}
