import { ChevronsRight, Pause, Play, Square, StepForward } from 'lucide-react';
import { BLOCK_SECONDS, MAX_PLAYBACK_SPEED } from '@/domain';
import { RUN_MODIFIER } from '@/shared/lib/format';
import { PauseAtMenu, type PauseAtMenuProps } from './PauseAtMenu';

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
  // A shift of one round has nothing to count.
  const counted = running && rounds > 1;
  return (
    <div className="playback-toolbar" role="group" aria-label="Simulation controls">
      <button
        className={`primary run-button ${running ? 'stop-button' : ''}`}
        aria-keyshortcuts={`Control+Enter Meta+Enter${running ? ' Escape' : ''}`}
        onClick={onRun}
      >
        {running ? <Square size={15} aria-hidden="true" /> : <Play size={15} fill="currentColor" aria-hidden="true" />}
        {/* The watch-only shift has no routine to go back to. */}
        {running ? (observation ? 'Stop watching' : 'Stop & edit') : observation ? 'Watch service' : 'Run service'}
        <kbd aria-hidden="true">{RUN_MODIFIER} ↵</kbd>
      </button>
      <button aria-label={paused ? 'Resume playback' : 'Pause playback'} disabled={!pausable} onClick={onTogglePause}>
        {paused ? <Play size={15} aria-hidden="true" /> : <Pause size={15} aria-hidden="true" />}{' '}
        {paused ? 'Resume' : 'Pause'}
      </button>
      {running && robot && onStep && (
        <>
          <button
            className="step-button"
            disabled={!paused}
            title={paused ? `Play on until ${robot} starts its next block, or starts waiting` : 'Pause to step'}
            onClick={onStep}
          >
            <StepForward size={15} aria-hidden="true" />
            <span className="step-label">Step {robot}</span>
          </button>
          {onStepCrew && (
            <button
              className="step-button"
              disabled={!paused}
              title={paused ? 'Play on until any of your robots starts a block, or starts waiting' : 'Pause to step'}
              onClick={onStepCrew}
            >
              <ChevronsRight size={15} aria-hidden="true" />
              <span className="step-label">Next event</span>
            </button>
          )}
        </>
      )}
      {pauseMenu && <PauseAtMenu {...pauseMenu} />}
      {running && bench && (
        <span className="playback-round practice" aria-hidden="true">
          <strong>Bench</strong>
          {eased ? 'Eased, for no stars' : 'For no stars'}
        </span>
      )}
      {counted && !bench && (
        <span className={'playback-round' + (practice ? ' practice' : '')} aria-hidden="true">
          {/* A service stops at its first slip, so every round before this one went right. */}
          {practice ? (
            <strong>Practice</strong>
          ) : (
            <span className="round-pips">
              {Array.from({ length: rounds }, (_, i) => (
                <i key={i} className={i < round - 1 ? 'passed' : i === round - 1 ? 'current' : undefined} />
              ))}
            </span>
          )}
          Round {round} of {rounds}
        </span>
      )}
      <label className="playback-speed">
        <span>
          Speed <strong>{speed}×</strong>
          <small>1 block · {(BLOCK_SECONDS / speed).toFixed(2)}s</small>
        </span>
        <input
          type="range"
          aria-label="Playback speed"
          aria-valuetext={`${speed}× speed`}
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
            ? (stepped ?? 'Service paused.')
            : `${bench ? `Running the bench${eased ? ` with ${eased}` : ''}, for no stars` : practice ? `Practising round ${round} of ${rounds}, for no stars` : `Service running${counted ? `, round ${round} of ${rounds}${round > 1 ? `, ${round - 1} passed` : ''}` : ''}`}.${observation ? '' : ' The routines are locked until it stops.'}`)}
      </p>
    </div>
  );
}
