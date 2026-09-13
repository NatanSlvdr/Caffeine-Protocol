import type { ExecutionEvent, RunResult } from './types';
export const MAX_PLAYBACK_SPEED = 6;
export const BLOCK_SECONDS = 2;
const AUTO_RATE = 12;
export interface PlaybackFrame { start: number; end: number; from: number; to: number; actions: ExecutionEvent[] }

/** Retimes presentation only: visible robot instructions get two seconds, automatic work stays fast. */
export function buildPlayback(result: RunResult | null): PlaybackFrame[] {
  if (!result) return [];
  const frames: PlaybackFrame[] = [];
  let clock = 0;
  const append = (from: number, to: number, seconds: number, actions: ExecutionEvent[]) => {
    frames.push({ start: clock, end: clock + seconds, from, to, actions }); clock += seconds;
  };
  append(-6, 0, 2, []);
  for (const seed of result.execution ?? []) {
    const actions: ExecutionEvent[] = [];
    for (const event of seed.events) {
      if (event.actor === 'niko' || event.line < 0 || ['END', 'ELSE'].includes(event.command) || event.command.startsWith('POSITION ')) continue;
      // A multi-tile MOVE is one code block, not one block per recorded tile edge.
      if (event.requested !== undefined) {
        const previous = actions.findLast(e => e.actor === event.actor);
        if (previous?.command === event.command && previous.line === event.line && Math.abs(previous.end - event.start) < .00001) { previous.end = event.end; previous.to = event.to; continue; }
      }
      actions.push({ ...event });
    }
    const points = [...new Set([0, seed.duration, ...actions.flatMap(e => [e.start, e.end])])].sort((a, b) => a - b);
    for (const [i, point] of points.entries()) {
      const instant = actions.filter(e => e.start === point && e.end === point);
      const queues = ['query', 'prep', 'floor'].map(actor => instant.filter(e => e.actor === actor));
      for (let n = 0; n < Math.max(0, ...queues.map(q => q.length)); n++) append(seed.start + point, seed.start + point, BLOCK_SECONDS, queues.flatMap(q => q[n] ? [q[n]] : []));
      const next = points[i + 1];
      if (next === undefined || next <= point) continue;
      const live = actions.filter(e => e.start <= point + 1e-7 && e.end >= next - 1e-7 && e.end > e.start);
      const scale = Math.max(1 / AUTO_RATE, ...live.map(e => BLOCK_SECONDS / (e.end - e.start)));
      append(seed.start + point, seed.start + next, (next - point) * scale, live);
    }
  }
  return frames;
}

export function samplePlayback(frames: PlaybackFrame[], clock: number) {
  const frame = frames.find(f => clock >= f.start && clock < f.end) ?? frames.at(-1);
  if (!frame) return { time: -6, actions: [] as ExecutionEvent[] };
  const progress = Math.max(0, Math.min(1, (clock - frame.start) / (frame.end - frame.start)));
  return { time: frame.from + (frame.to - frame.from) * progress, actions: frame.actions };
}

/** Inspector navigation seeks by the original simulation clock. */
export function playbackClock(frames: PlaybackFrame[], time: number) {
  const frame = frames.find(f => time >= f.from && time < f.to || f.from === time && f.to === time);
  return frame ? frame.start + (frame.to === frame.from ? 0 : (time - frame.from) / (frame.to - frame.from) * (frame.end - frame.start)) : frames.at(-1)?.end ?? 0;
}
