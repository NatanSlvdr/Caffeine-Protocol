import type { RobotRole } from '../domain/types';
import { ROBOT_NAMES } from '../data/extension';
import { BookOpen, SlidersHorizontal } from 'lucide-react';

/** Keep the objective fixed; robot navigation only appears once there is a choice. */
export function CodingPaneHeader({ shift, objective, story, level, role, onRole, onHelp, onOptions }: {
  shift: string; objective: string; level: number; role: RobotRole; onRole: (role: RobotRole) => void;
  story?: string; onHelp?: () => void; onOptions?: () => void;
}) {
  const available = (['query', 'prep', 'floor'] as const).filter(r => r === 'query' || r === 'prep' && level >= 15 || r === 'floor' && level >= 23);
  return <>
    <header className="coding-pane-heading">
      <div className="coding-title-row"><h2>{shift}</h2><div className="coding-tools">
        {onHelp && <button type="button" aria-label="Help" title="Help" onClick={onHelp}><BookOpen size={14}/></button>}
        {onOptions && <button type="button" aria-label="Options" title="Options" onClick={onOptions}><SlidersHorizontal size={14}/></button>}
      </div></div>
      {story && <p className="shift-story">{story}</p>}
      <p className="shift-objective"><span>Your goal</span>{objective}</p>
    </header>
    {available.length > 1 && <div className="robot-tabs" role="tablist" aria-label="Robot programs">
      {available.map(r => <button key={r} role="tab" aria-selected={role === r} onClick={() => onRole(r)}>{ROBOT_NAMES[r]}</button>)}
    </div>}
  </>;
}
