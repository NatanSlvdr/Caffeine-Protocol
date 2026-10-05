export const BUDGETS: { startup: number; total: number };
/** What a build weighs: the files the page needs before it can draw, their gzipped size, and the whole build. */
export function payload(dist: string): { startupFiles: string[]; startup: number; total: number };
/** Every budget the build in `dist` is over; empty when it fits. */
export function payloadErrors(dist: string, budgets?: { startup: number; total: number }): string[];
