import { spokenBlock } from '@/domain';
import type { RobotRole, sampleReplay } from '@/domain';
import type { RobotTabActivity } from '@/components';
import { PAUSE_WORDS, type PauseWords } from './pauseWords';

const ROLES: readonly RobotRole[] = ['query', 'prep', 'floor'];
const isWait = (command: string) => command === 'LISTEN' || command.startsWith('WAIT ');

/**
 * Each robot's activity at the sampled moment. A robot waiting for orders is the café working as it should, not the
 * run stuck: a run where nothing more can happen stops at once and says who was left waiting.
 */
export function crewActivity(
  sampled: ReturnType<typeof sampleReplay>,
  say: PauseWords = PAUSE_WORDS.en,
): Partial<Record<RobotRole, RobotTabActivity>> {
  const activity: Partial<Record<RobotRole, RobotTabActivity>> = {};
  for (const role of ROLES) {
    const actor = sampled.actors[role];
    if (!actor) continue;
    const last = sampled.seed?.events.findLast((e) => e.actor === role && e.start <= sampled.local && !e.error);
    const action = actor.action?.command;
    if (actor.action?.waiting) activity[role] = { state: 'waiting', label: say.waits[actor.action.waiting] };
    else if (action && isWait(action)) activity[role] = { state: 'waiting', label: say.waitBlock(spokenBlock(action)) };
    else if (last?.command === 'STOP' && last.end <= sampled.local)
      activity[role] = { state: 'stopped', label: say.stopped };
    else if (!last) activity[role] = { state: 'waiting', label: say.doors };
    else activity[role] = { state: 'working', label: say.working(spokenBlock(action ?? last.command)) };
  }
  return activity;
}
