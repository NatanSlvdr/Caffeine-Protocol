import { spokenBlock } from '@/domain';
import type { RobotRole, sampleReplay } from '@/domain';
import type { RobotTabActivity } from '@/components';
import { WAIT_LABELS } from './inspector';

const ROLES: readonly RobotRole[] = ['query', 'prep', 'floor'];
const isWait = (command: string) => command === 'LISTEN' || command.startsWith('WAIT ');

/**
 * Each robot's activity at the sampled moment. A robot waiting for orders is the café working as it should, not the
 * run stuck: a run where nothing more can happen stops at once and says who was left waiting.
 */
export function crewActivity(sampled: ReturnType<typeof sampleReplay>): Partial<Record<RobotRole, RobotTabActivity>> {
  const activity: Partial<Record<RobotRole, RobotTabActivity>> = {};
  for (const role of ROLES) {
    const actor = sampled.actors[role];
    if (!actor) continue;
    const last = sampled.seed?.events.findLast((e) => e.actor === role && e.start <= sampled.local && !e.error);
    const action = actor.action?.command;
    if (actor.action?.waiting) activity[role] = { state: 'waiting', label: WAIT_LABELS[actor.action.waiting] };
    else if (action && isWait(action))
      activity[role] = { state: 'waiting', label: `Waiting ${spokenBlock(action).replace(/^wait /, '')}` };
    else if (last?.command === 'STOP' && last.end <= sampled.local)
      activity[role] = { state: 'stopped', label: 'Stopped for the night' };
    else if (!last) activity[role] = { state: 'waiting', label: 'Waiting for the doors to open' };
    else activity[role] = { state: 'working', label: `Working on “${spokenBlock(action ?? last.command)}”` };
  }
  return activity;
}
