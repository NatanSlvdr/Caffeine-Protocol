import type { RobotRole } from './types';

/** Every programmable robot, in unlock order. Key registries by id, never by index. */
export const ROBOT_ROLES: readonly RobotRole[] = ['query', 'prep', 'floor'];

/** Display names keyed by robot id — the single RobotMeta name source. */
export const ROBOT_DISPLAY_NAMES: Record<RobotRole, string> = { query: 'Query', prep: 'Brew', floor: 'Porter' };

/** Area labels keyed by robot id. */
export const ROBOT_AREA_LABELS: Record<RobotRole, string> = {
  query: 'Query’s counter',
  prep: 'Brew’s kitchen',
  floor: 'Porter’s dining room',
};

/** 1-based campaign level at which each robot becomes programmable. */
export const ROBOT_UNLOCK_LEVELS: Record<RobotRole, number> = { query: 3, prep: 15, floor: 23 };

export const robotUnlocked = (role: RobotRole, level: number): boolean => level >= ROBOT_UNLOCK_LEVELS[role];

/** Default programmable role for a 1-based campaign level. */
export function robotForLevel(level: number): RobotRole {
  return level >= ROBOT_UNLOCK_LEVELS.floor ? 'floor' : level >= ROBOT_UNLOCK_LEVELS.prep ? 'prep' : 'query';
}

/** Split robots into programmable vs locked for a 1-based campaign level. */
export function splitByUnlock(level: number): { unlocked: RobotRole[]; locked: RobotRole[] } {
  const unlocked: RobotRole[] = [];
  const locked: RobotRole[] = [];
  for (const role of ROBOT_ROLES) (robotUnlocked(role, level) ? unlocked : locked).push(role);
  return { unlocked, locked };
}

/** Scene name: automatic stand-ins (Moka/Pip) cover the locked kitchen/floor roles. */
export function robotActorName(role: 'prep' | 'floor', level: number): string {
  if (role === 'prep') return robotUnlocked('prep', level) ? ROBOT_DISPLAY_NAMES.prep : 'Moka';
  return robotUnlocked('floor', level) ? ROBOT_DISPLAY_NAMES.floor : 'Pip';
}
