import type { KeyboardEvent } from 'react';
import { ChefHat, ConciergeBell, ReceiptText } from 'lucide-react';
import { ROBOT_UNLOCK_LEVELS, splitByUnlock } from '@/domain/robots';
import type { RobotRole } from '@/domain';
import { pad2 } from '@/shared/lib/format';

export const robotIcons = { query: ReceiptText, prep: ChefHat, floor: ConciergeBell };

/** The robot tabs control the code zone below them, labelled by whichever tab is open. */
export const ROUTINE_PANEL = 'robot-routine';
export const routineTab = (robot: RobotRole) => `robot-tab-${robot}`;

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

const joins = (robot: RobotRole) => `Joins the crew on Shift ${pad2(ROBOT_UNLOCK_LEVELS[robot])}`;

/** What a robot is up to while a run plays, shown on its tab: busy, waiting for work, or done for the day. */
export interface RobotTabActivity {
  state: 'working' | 'waiting' | 'stopped';
  /** What it's doing or waiting for, in the words its blocks use. */
  label: string;
}

const ACTIVITY_WORDS = { working: 'working', waiting: 'waiting', stopped: 'stopped' } as const;

interface RobotListProps {
  level: number;
  /** Each robot's activity during a run; tabs only. */
  activity?: Partial<Record<RobotRole, RobotTabActivity>>;
  selected?: RobotRole;
  labels: Record<RobotRole, string>;
  onSelect: (robot: RobotRole) => void;
  tabs: boolean;
}

function RobotList({ level, selected, labels, onSelect, tabs, activity }: RobotListProps) {
  const { unlocked, locked } = splitByUnlock(level);
  const current = selected && unlocked.includes(selected) ? selected : unlocked[0];
  // Tabs follow the arrow keys, Home and End, wrapping round the robots already running.
  const step = (e: KeyboardEvent<HTMLButtonElement>, robot: RobotRole) => {
    const at = unlocked.indexOf(robot);
    const to = ({ ArrowLeft: at - 1, ArrowRight: at + 1, Home: 0, End: unlocked.length - 1 } as Record<string, number>)[
      e.key
    ];
    if (to === undefined) return;
    e.preventDefault();
    const next = unlocked[(to + unlocked.length) % unlocked.length];
    onSelect(next);
    e.currentTarget.closest('[role="tablist"]')?.querySelector<HTMLElement>(`[data-robot="${next}"]`)?.focus();
  };
  const button = (robot: RobotRole, disabled: boolean) => {
    const doing = tabs && !disabled ? activity?.[robot] : undefined;
    return (
      <button
        key={robot}
        type="button"
        data-robot={robot}
        id={tabs ? routineTab(robot) : undefined}
        role={tabs ? 'tab' : undefined}
        aria-controls={tabs && !disabled ? ROUTINE_PANEL : undefined}
        aria-selected={tabs ? !disabled && selected === robot : undefined}
        aria-pressed={tabs ? undefined : !disabled && selected === robot}
        aria-description={disabled ? joins(robot) : doing?.label}
        data-activity={doing?.state}
        // Only the open tab sits in the Tab order; the arrows reach the others.
        tabIndex={tabs && !disabled ? (robot === current ? 0 : -1) : undefined}
        // A greyed-out robot says on hover when it arrives, not just to screen readers.
        title={disabled ? `${labels[robot]} · ${joins(robot)}` : tabs ? doing?.label : labels[robot]}
        disabled={disabled}
        onClick={() => onSelect(robot)}
        onKeyDown={tabs ? (e) => step(e, robot) : undefined}
      >
        <RobotChoice robot={robot} label={labels[robot]} />
        {doing && (
          <span className="robot-activity" aria-hidden="true">
            {ACTIVITY_WORDS[doing.state]}
          </span>
        )}
      </button>
    );
  };
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
