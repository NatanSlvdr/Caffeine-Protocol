import { Pause, Play, Square } from 'lucide-react';
import { BLOCK_SECONDS, MAX_PLAYBACK_SPEED } from '@/domain';

export interface PlaybackToolbarProps {
  running: boolean;
  observation: boolean;
  paused: boolean;
  pausable: boolean;
  speed: number;
  onRun: () => void;
  onTogglePause: () => void;
  onSpeed: (speed: number) => void;
}

/** Run/stop, pause, and speed controls for the live simulation clock. */
export function PlaybackToolbar({ running, observation, paused, pausable, speed, onRun, onTogglePause, onSpeed }: PlaybackToolbarProps) {
  return (
    <div className="playback-toolbar" aria-label="Simulation controls">
      <button className={`primary run-button ${running ? 'stop-button' : ''}`} onClick={onRun}>
        {running ? <Square size={15} /> : <Play size={15} fill="currentColor" />}
        {running ? 'Stop & edit' : observation ? 'Watch service' : 'Run service'}
        <kbd>{navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} ↵</kbd>
      </button>
      <button aria-label={paused ? 'Resume playback' : 'Pause playback'} disabled={!pausable} onClick={onTogglePause}>
        {paused ? <Play size={15} /> : <Pause size={15} />} {paused ? 'Resume' : 'Pause'}
      </button>
      <label className="playback-speed">
        <span>
          Speed <strong>{speed}×</strong>
          <small>
            1 block · {(BLOCK_SECONDS / speed).toFixed(2)}s
          </small>
        </span>
        <input
          type="range"
          aria-label="Playback speed"
          min={1}
          max={MAX_PLAYBACK_SPEED}
          step={0.25}
          value={speed}
          onChange={(e) => onSpeed(Number(e.target.value))}
        />
      </label>
    </div>
  );
}
