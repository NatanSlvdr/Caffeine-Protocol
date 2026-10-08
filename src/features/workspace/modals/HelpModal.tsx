import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Crosshair, Dumbbell, MessageCircle } from 'lucide-react';
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
import { RUN_MODIFIER } from '@/shared/lib/format';
import { useWords } from '@/shared/language';
import type { ShiftBrief } from '../Workspace';
import type { RunEvidence } from '../evidence';
import { clueFor, HINT_TIERS, type Clue, type WorkspaceDrill } from '../hints';
import { CHALLENGE_WORDS } from '../challenges';
import { HELP_WORDS } from './helpWords';

export interface HelpModalProps {
  /** What the kicker calls the shift: "Shift 03", or "Special". */
  label: string;
  title: string;
  lesson: { note: string; solution: string; robotSolution?: RobotPrograms };
  brief: ShiftBrief;
  /** The language of the title, lesson note and brief when it isn't the page's: a wave's, still English. */
  briefLang?: string;
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
  /** A served shift's drill on the idea the last failed run missed, named beside the clue. */
  drill?: WorkspaceDrill;
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
  label,
  title,
  lesson,
  brief,
  briefLang,
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
  drill,
  onShowClue,
  onUseExample,
  onReplayIntro,
  onClose,
}: HelpModalProps) {
  const say = useWords(HELP_WORDS);
  const challengeWords = useWords(CHALLENGE_WORDS);
  const example = lesson.robotSolution?.[role] ?? lesson.solution;
  const robot = ROBOT_DISPLAY_NAMES[role];
  // The example replaces the routine wholesale, so the player's own edits get a second look first, and a reminder
  // that Undo brings them back. The opening routine needs none: Reset brings it back too.
  const edited = ![opening, example].some((kept) => kept.trim() === source.trim());
  // Already the routine: using it again would change nothing.
  const inUse = example.trim() === source.trim();
  const showSolution = hints >= HINT_TIERS;
  const clue = hints >= 2 ? clueFor(role, source, example, evidence, stale, say.clue) : undefined;
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
      kicker={say.kicker(label)}
      title={title}
      titleLang={briefLang}
      onClose={onClose}
    >
      <div className="lesson-note" lang={briefLang}>
        {lesson.note}
      </div>
      <p lang={briefLang}>{brief.story}</p>
      <button
        className="settings-chip help-replay-intro"
        disabled={running}
        aria-describedby={running ? 'help-running' : undefined}
        onClick={onReplayIntro}
      >
        <MessageCircle size={14} aria-hidden="true" /> {say.replay}
      </button>
      {/* Greyed-out buttons say why: the café is mid-service. */}
      {running && (
        <p id="help-running" className="help-running">
          {say.running(!observation && showSolution && !inUse)}
        </p>
      )}
      <p>
        <strong>{say.goal}</strong> <span lang={briefLang}>{brief.objective}</span>
      </p>
      {!observation && (
        <>
          <dl className="help-targets">
            {say.targets(level.block_target, level.instruction_target).map(({ stars, goal, why }, i) => (
              <div key={stars}>
                <dt>
                  <span aria-hidden="true">{'★'.repeat(i + 1)}</span>
                  <span className="sr-only">{stars}</span>
                </dt>
                <dd>
                  {goal}
                  <small>{why}</small>
                </dd>
              </div>
            ))}
          </dl>
          {challengesMet && level.challenges && (
            <section className="help-challenges" aria-labelledby="help-challenges-lead">
              <p id="help-challenges-lead">{say.challenges}</p>
              <ul>
                {level.challenges.map(({ measure, target }) => {
                  const words = challengeWords[measure];
                  const met = challengesMet.includes(measure);
                  return (
                    <li key={measure} className={met ? 'met' : ''}>
                      <strong>{words.name}</strong>
                      {met && <span className="help-challenge-met">{say.met}</span>}
                      <span className="help-challenge-goal">{words.goal(target)}</span>
                      <small>{words.note}</small>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
          {hints > 0 && (
            <ol className="help-hints" aria-label={say.hints}>
              <li>
                <span className="help-hint-label">{say.tiers[0]}</span>
                <p lang={briefLang}>{brief.concept}</p>
              </li>
              {clue && (
                <li>
                  <span className="help-hint-label">{say.tiers[1]}</span>
                  <p>{clue.text}</p>
                  {clue.show && (
                    <button className="settings-chip help-hint-show" onClick={() => onShowClue(clue.show!)}>
                      <Crosshair size={14} aria-hidden="true" /> {say.show}
                    </button>
                  )}
                  {drill && (
                    <p className="help-drill">
                      <Dumbbell size={14} aria-hidden="true" />
                      <span>{say.drill(drill.shift, drill.title)}</span>
                    </p>
                  )}
                </li>
              )}
            </ol>
          )}
          {confirming ? (
            <>
              <p className="help-example-warning" role="alert">
                {say.warning(robot, RUN_MODIFIER)}
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
                  {say.keep}
                </button>
                <Button variant="primary" disabled={running} onClick={() => onUseExample(example)}>
                  {say.replace} <ArrowRight size={15} aria-hidden="true" />
                </Button>
              </div>
            </>
          ) : (
            <div className="modal-buttons help-example-actions">
              {/* One button climbs the tiers; at the top it hides and shows the example, keeping the hints above. */}
              <button
                className="settings-chip"
                aria-expanded={hints >= HINT_TIERS - 1 ? showSolution : undefined}
                aria-controls={showSolution ? 'worked-example' : undefined}
                onClick={() => {
                  setConfirming(false);
                  revealing.current = hints === HINT_TIERS - 1;
                  onHints(showSolution ? hints - 1 : hints + 1);
                }}
              >
                {say.next[hints]}
              </button>
              {showSolution &&
                (inUse ? (
                  <Button variant="primary" disabled>
                    {say.inUse}
                  </Button>
                ) : (
                  <Button
                    ref={useButton}
                    variant="primary"
                    disabled={running}
                    aria-describedby={running ? 'help-running' : undefined}
                    onClick={() => (edited ? setConfirming(true) : onUseExample(example))}
                  >
                    {say.use} <ArrowRight size={15} aria-hidden="true" />
                  </Button>
                ))}
              {!showSolution && (
                <span className="help-hint-count" aria-hidden="true">
                  {hints ? say.asked(hints, HINT_TIERS) : say.oneAtATime}
                </span>
              )}
            </div>
          )}
          {showSolution && (
            <>
              {lesson.robotSolution && <p className="code-example-label">{say.exampleFor(robot)}</p>}
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
