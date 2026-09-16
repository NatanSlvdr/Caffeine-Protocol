import type { RobotRole } from '../domain/types';
import { ROBOT_NAMES, ROBOT_UNLOCK_LEVELS } from '../data/extension';
import { BookOpen, Bot, LockKeyhole, SlidersHorizontal } from 'lucide-react';

/** Keep every robot directly below the goal, with explicit unlock states. */
export function CodingPaneHeader({ shift, objective, story, level, role, onRole, onHelp, onOptions }: {
  shift: string; objective: string; level: number; role: RobotRole; onRole: (role: RobotRole) => void;
  story?: string; onHelp?: () => void; onOptions?: () => void;
}) {
  const robots = ['query', 'prep', 'floor'] as const;
  return <>
    <header className="coding-pane-heading">
      <div className="coding-title-row"><h2>{shift}</h2><div className="coding-tools">
        {onHelp && <button type="button" aria-label="Help" title="Help" onClick={onHelp}><BookOpen size={14}/></button>}
        {onOptions && <button type="button" aria-label="Options" title="Options" onClick={onOptions}><SlidersHorizontal size={14}/></button>}
      </div></div>
      {story && <p className="shift-story">{story}</p>}
      <p className="shift-objective"><span>Your goal</span>{objective}</p>
    </header>
    <div className="robot-tabs" role="tablist" aria-label="Robot programs">
      {robots.map(r => {const locked=level<ROBOT_UNLOCK_LEVELS[r];return <button key={r} type="button" role="tab" aria-selected={!locked&&role === r} disabled={locked} title={locked?`Unlocks at shift ${ROBOT_UNLOCK_LEVELS[r]}`:undefined} onClick={() => onRole(r)}>{locked?<LockKeyhole size={14} aria-hidden="true"/>:<Bot size={14} aria-hidden="true"/>}{ROBOT_NAMES[r]}</button>;})}
    </div>
  </>;
}
