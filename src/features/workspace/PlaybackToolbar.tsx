import { Pause, Play, Square } from 'lucide-react';
import { BLOCK_SECONDS, MAX_PLAYBACK_SPEED } from '@/domain';
import { RUN_MODIFIER } from '@/shared/lib/format';

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
  onRun: () => void;
  onTogglePause: () => void;
  onSpeed: (speed: number) => void;
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
  onRun,
  onTogglePause,
  onSpeed,
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
      {counted && (
        <span className={'playback-round' + (practice ? ' practice' : '')} aria-hidden="true">
          {practice && <strong>Practice</strong>}
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
            ? 'Service paused.'
            : `${practice ? `Practising round ${round} of ${rounds}, for no stars` : `Service running${counted ? `, round ${round} of ${rounds}` : ''}`}.${observation ? '' : ' The routines are locked until it stops.'}`)}
      </p>
    </div>
  );
}
