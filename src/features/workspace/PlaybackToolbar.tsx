import { ChevronsRight, Pause, Play, Square, StepForward } from 'lucide-react';
import { BLOCK_SECONDS, MAX_PLAYBACK_SPEED } from '@/domain';
import { RUN_MODIFIER } from '@/shared/lib/format';
import { useWords } from '@/shared/language';
import { PauseAtMenu, type PauseAtMenuProps } from './PauseAtMenu';
import { WORKSPACE_WORDS } from './workspaceWords';

export interface PlaybackToolbarProps {
  running: boolean;
  observation: boolean;
  paused: boolean;
  pausable: boolean;
  speed: number;
  /** The round of guests on screen, and how many the shift sends in. */
  round: number;
  rounds: number;
  /** The run plays one round as practice, which earns no stars. */
  practice: boolean;
  /** The round is a bench the player wrote, which earns no stars either. */
  bench?: boolean;
  /** The shift's rules the bench eases, said after "with": "twice the cups"; nothing when it eases none. */
  eased?: string;
  onRun: () => void;
  onTogglePause: () => void;
  onSpeed: (speed: number) => void;
  /** The open robot, which Step plays on to; stepping is for a service with routines to follow. */
  robot?: string;
  /** While paused, play on to the open robot's next block or wait. */
  onStep?: () => void;
  /** While paused, play on to the next block or wait any of the player's robots starts; for a crew of more than one. */
  onStepCrew?: () => void;
  /** What started at the moment the last step stopped on, said for a screen reader. */
  stepped?: string;
  /** Where the service pauses by itself; for a service with routines to follow. */
  pauseMenu?: PauseAtMenuProps;
}

/** Run/stop, pause, and speed controls for the live simulation clock. */
export function PlaybackToolbar({
  running,
  observation,
  paused,
  pausable,
  speed,
  round,
  rounds,
  practice,
  bench = false,
  eased = '',
  onRun,
  onTogglePause,
  onSpeed,
  robot,
  onStep,
  onStepCrew,
  stepped,
  pauseMenu,
}: PlaybackToolbarProps) {
  const say = useWords(WORKSPACE_WORDS).toolbar;
  // A shift of one round has nothing to count.
  const counted = running && rounds > 1;
  return (
    <div className="playback-toolbar" role="group" aria-label={say.group}>
      <button
        className={`primary run-button ${running ? 'stop-button' : ''}`}
        aria-keyshortcuts={`Control+Enter Meta+Enter${running ? ' Escape' : ''}`}
        onClick={onRun}
      >
        {running ? <Square size={15} aria-hidden="true" /> : <Play size={15} fill="currentColor" aria-hidden="true" />}
        {/* The watch-only shift has no routine to go back to. */}
        {say.run(running, observation)}
        <kbd aria-hidden="true">{RUN_MODIFIER} ↵</kbd>
      </button>
      <button aria-label={paused ? say.resumeLabel : say.pauseLabel} disabled={!pausable} onClick={onTogglePause}>
        {paused ? <Play size={15} aria-hidden="true" /> : <Pause size={15} aria-hidden="true" />}{' '}
        {paused ? say.resume : say.pause}
      </button>
      {running && robot && onStep && (
        <>
          <button
            className="step-button"
            disabled={!paused}
            title={paused ? say.stepTitle(robot) : say.pauseToStep}
            onClick={onStep}
          >
            <StepForward size={15} aria-hidden="true" />
            <span className="step-label">{say.step(robot)}</span>
          </button>
          {onStepCrew && (
            <button
              className="step-button"
              disabled={!paused}
              title={paused ? say.nextEventTitle : say.pauseToStep}
              onClick={onStepCrew}
            >
              <ChevronsRight size={15} aria-hidden="true" />
              <span className="step-label">{say.nextEvent}</span>
            </button>
          )}
        </>
      )}
      {pauseMenu && <PauseAtMenu {...pauseMenu} />}
      {running && bench && (
        <span className="playback-round practice" aria-hidden="true">
          <strong>{say.bench}</strong>
          {say.noStars(!!eased)}
        </span>
      )}
      {counted && !bench && (
        <span className={'playback-round' + (practice ? ' practice' : '')} aria-hidden="true">
          {/* A service stops at its first slip, so every round before this one went right. */}
          {practice ? (
            <strong>{say.practice}</strong>
          ) : (
            <span className="round-pips">
              {Array.from({ length: rounds }, (_, i) => (
                <i key={i} className={i < round - 1 ? 'passed' : i === round - 1 ? 'current' : undefined} />
              ))}
            </span>
          )}
          {say.round(round, rounds)}
        </span>
      )}
      <label className="playback-speed">
        <span>
          {say.speed} <strong>{say.times(speed)}</strong>
          <small>{say.perBlock(BLOCK_SECONDS / speed)}</small>
        </span>
        <input
          type="range"
          aria-label={say.speedLabel}
          aria-valuetext={say.speedSaid(speed)}
          min={1}
          max={MAX_PLAYBACK_SPEED}
          step={0.25}
          value={speed}
          onChange={(e) => onSpeed(Number(e.target.value))}
        />
      </label>
      {/* The café is drawn, so a screen reader hears from here that service started, paused, or locked the code. */}
      <p className="sr-only" role="status">
        {running &&
          (paused
            ? (stepped ?? say.paused)
            : say.playing({ bench, eased, practice, round, rounds, counted, observation }))}
      </p>
    </div>
  );
}
