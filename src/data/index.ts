import { lessons as actLessons, levels as actLevels } from './campaign/load';
import { extensionLevels, extensionLessons } from './extension';
import type { LevelDefinition } from '../domain/types';
export const levels: LevelDefinition[] = [...actLevels, ...extensionLevels];
export const lessons = [...actLessons, ...extensionLessons];
export const CAMPAIGN_LENGTH = levels.length;
export const MAX_STARS = levels.filter((l) => l.programming_enabled).length * 3;
export const titleFor = (index: number) => levels[index]?.title.replace(/^Level \d+: /, '') ?? `Shift ${index + 1}`;
