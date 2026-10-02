import type { RobotRole } from '@/domain';
import { ROBOT_DISPLAY_NAMES } from '@/domain/robots';
import { BookOpen, SlidersHorizontal } from 'lucide-react';
import { RobotOptions } from './RobotChoice';

/** Keep every robot directly below the goal, with explicit unlock states. */
export function CodingPaneHeader({
  shift,
  objective,
  story,
  level,
  role,
  onRole,
  onHelp,
  onOptions,
}: {
  shift: string;
  objective: string;
  level: number;
  role: RobotRole;
  onRole: (role: RobotRole) => void;
  story?: string;
  onHelp?: () => void;
  onOptions?: () => void;
}) {
  return (
    <section className="coding-pane">
      <header className="coding-pane-heading">
        <div className="coding-title-row">
          <h2 data-screen-title tabIndex={-1}>
            {shift}
          </h2>
          <div className="coding-tools">
            {onHelp && (
              <button type="button" aria-label="Help" aria-haspopup="dialog" title="Help" onClick={onHelp}>
                <BookOpen size={14} aria-hidden="true" />
              </button>
            )}
            {onOptions && (
              <button type="button" aria-label="Options" aria-haspopup="dialog" title="Options" onClick={onOptions}>
                <SlidersHorizontal size={14} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
        {story && <p className="shift-story">{story}</p>}
        <p className="shift-objective">
          <span>Your goal</span>
          {objective}
        </p>
      </header>
      <div className="robot-tabs" role="tablist" aria-label="Robot routines">
        <RobotOptions level={level} selected={role} labels={ROBOT_DISPLAY_NAMES} onSelect={onRole} tabs />
      </div>
    </section>
  );
}
