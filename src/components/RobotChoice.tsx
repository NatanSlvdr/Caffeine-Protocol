import { ChefHat, ConciergeBell, ReceiptText } from 'lucide-react';
import { splitByUnlock } from '@/domain/robots';
import type { RobotRole } from '@/domain';

export const robotIcons = { query: ReceiptText, prep: ChefHat, floor: ConciergeBell };

/** Keep each robot recognizable in the camera and program selectors. */
export function RobotChoice({ robot, label }: { robot: RobotRole; label: string }) {
  const Icon = robotIcons[robot];
  return (
    <span className="robot-choice-label">
      <Icon size={17} aria-hidden="true" />
      {label}
    </span>
  );
}

interface RobotListProps {
  level: number;
  selected?: RobotRole;
  labels: Record<RobotRole, string>;
  onSelect: (robot: RobotRole) => void;
  tabs: boolean;
}

function RobotList({ level, selected, labels, onSelect, tabs }: RobotListProps) {
  const { unlocked, locked } = splitByUnlock(level);
  const button = (robot: RobotRole, disabled: boolean) => (
    <button
      key={robot}
      type="button"
      role={tabs ? 'tab' : undefined}
      aria-selected={tabs ? !disabled && selected === robot : undefined}
      aria-pressed={tabs ? undefined : !disabled && selected === robot}
      title={tabs ? undefined : labels[robot]}
      disabled={disabled}
      onClick={() => onSelect(robot)}
    >
      <RobotChoice robot={robot} label={labels[robot]} />
    </button>
  );
  return (
    <>
      {unlocked.map((robot) => button(robot, false))}
      {locked.length > 0 && (
        <div className="locked-robot-zone" style={{ flexGrow: locked.length }}>
          <div className="locked-robot-buttons">{locked.map((robot) => button(robot, true))}</div>
        </div>
      )}
    </>
  );
}

export type RobotOptionsProps = Omit<RobotListProps, 'tabs'> & { tabs?: boolean };

/** Tab-style robot switcher for the program editor. */
export function RobotTabs(props: Omit<RobotOptionsProps, 'tabs'>) {
  return <RobotList {...props} tabs />;
}

/** Toggle-style robot switcher for the camera controls. */
export function RobotButtons(props: Omit<RobotOptionsProps, 'tabs'>) {
  return <RobotList {...props} tabs={false} />;
}

/** Unavailable robots stay listed, greyed out, after the ones already running. */
export function RobotOptions({ tabs = false, ...props }: RobotOptionsProps) {
  return tabs ? <RobotTabs {...props} /> : <RobotButtons {...props} />;
}
