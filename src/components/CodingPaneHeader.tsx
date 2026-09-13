import type { RobotRole } from '../domain/types';
import { ROBOT_NAMES } from '../data/extension';

/** Keep the objective fixed; robot navigation only appears once there is a choice. */
export function CodingPaneHeader({ shift, objective, level, role, onRole }: {
  shift: string; objective: string; level: number; role: RobotRole; onRole: (role: RobotRole) => void;
}) {
  const available = (['query', 'prep', 'floor'] as const).filter(r => r === 'query' || r === 'prep' && level >= 15 || r === 'floor' && level >= 23);
  return <>
    <header className="coding-pane-heading"><h2>{shift}</h2><p>{objective}</p></header>
    {available.length > 1 && <div className="robot-tabs" role="tablist" aria-label="Robot programs">
      {available.map(r => <button key={r} role="tab" aria-selected={role === r} onClick={() => onRole(r)}>{ROBOT_NAMES[r]}</button>)}
    </div>}
  </>;
}
