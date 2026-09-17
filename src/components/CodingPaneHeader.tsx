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
    <>
      <header className="coding-pane-heading">
        <div className="coding-title-row">
          <h2>{shift}</h2>
          <div className="coding-tools">
            {onHelp && (
              <button type="button" aria-label="Help" title="Help" onClick={onHelp}>
                <BookOpen size={14} />
              </button>
            )}
            {onOptions && (
              <button type="button" aria-label="Options" title="Options" onClick={onOptions}>
                <SlidersHorizontal size={14} />
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
      <div className="robot-tabs" role="tablist" aria-label="Robot programs">
        <RobotOptions level={level} selected={role} labels={ROBOT_DISPLAY_NAMES} onSelect={onRole} tabs />
      </div>
    </>
  );
}
