import { ChefHat, ConciergeBell, LockKeyhole, ReceiptText } from 'lucide-react';
import { useId } from 'react';
import { ROBOT_UNLOCK_LEVELS } from '../data/extension';
import type { RobotRole } from '../domain/types';

const robotIcons = { query: ReceiptText, prep: ChefHat, floor: ConciergeBell };
const robots = ['query', 'prep', 'floor'] as const;

/** Keep each robot recognizable in the camera and program selectors. */
export function RobotChoice({ robot, label }: { robot: RobotRole; label: string }) {
  const Icon = robotIcons[robot];
  return <span className="robot-choice-label"><Icon size={17} aria-hidden="true"/>{label}</span>;
}

/** Group unavailable robots beneath one shared unlock notice. */
export function RobotOptions({ level, selected, labels, onSelect, tabs = false }: {
  level: number; selected?: RobotRole; labels: Record<RobotRole, string>;
  onSelect: (robot: RobotRole) => void; tabs?: boolean;
}) {
  const noticeId = useId();
  const locked = robots.filter(robot => level < ROBOT_UNLOCK_LEVELS[robot]);
  const button = (robot: RobotRole, disabled: boolean) => <button key={robot} type="button"
    role={tabs ? 'tab' : undefined} aria-selected={tabs ? !disabled && selected === robot : undefined}
    aria-pressed={tabs ? undefined : !disabled && selected === robot}
    aria-describedby={disabled ? noticeId : undefined} disabled={disabled} onClick={() => onSelect(robot)}>
    <RobotChoice robot={robot} label={labels[robot]}/>
  </button>;
  return <>
    {robots.filter(robot => !locked.includes(robot)).map(robot => button(robot, false))}
    {locked.length > 0 && <div className="locked-robot-zone" style={{ flexGrow: locked.length }}>
      <div className="locked-robot-buttons">{locked.map(robot => button(robot, true))}</div>
      <div className="robot-choice-lock" id={noticeId}><LockKeyhole size={12} aria-hidden="true"/>
        <span>Locked</span>
      </div>
    </div>}
  </>;
}
