import { useState, type KeyboardEvent } from 'react';
import { ChevronLeft, ChevronRight, Undo2 } from 'lucide-react';
import { ROBOT_DISPLAY_NAMES, type Moment, type RobotPrograms, type RobotRole } from '@/domain';
import { jumpTargets, landOn, momentWords, momentsAt, nextMoment, type JumpFilter } from './timeline';
import { useWords } from '@/shared/language';
import { PAUSE_WORDS } from './pauseWords';
import { ROUTE_WORDS } from './routeWords';
import type { Followable } from './route';

export interface ReplayTimelineProps {
  /** How far the run has got, on the service clock. */
  head: number;
  /** The moment on screen: the latest, or an earlier one. */
  time: number;
  viewing: boolean;
  /** Everything that has happened in the run so far. */
  moments: readonly Moment[];
  /** When each round after the first began, to draw where one ends and the next starts. */
  roundStarts: readonly number[];
  /** How many rounds the shift sends in, for saying when a moment was. */
  rounds: number;
  /** The moment on screen, like "Round 2 · 42.0 s". */
  when: string;
  crew: readonly RobotRole[];
  /** The open robot, whose blocks the timeline can jump between. */
  role: RobotRole;
  programs: RobotPrograms;
  textMode: boolean;
  /** Look at a moment, or back at the latest with nothing. */
  onView: (at: number | null) => void;
  /** A moment jumped to, so the routine of the robot it belongs to can be opened at it. */
  onMoment?: (moment: Moment) => void;
  /** The guests whose orders can be followed, and the one that is, by round and id. */
  followable: readonly Followable[];
  following?: { seed: string; guest: string };
  /** Follow a guest's order, or stop following with nothing. */
  onFollow: (guest: { seed: string; guest: string } | null) => void;
}

type Kind = 'all' | 'order' | 'handoff' | 'robot';

/**
 * Looking back through a paused or slipped run: a scrubber over everything recorded so far, with the orders, handoffs
 * and slips drawn on it, and buttons that jump from one to the next, or between the open robot's blocks; and a choice
 * of guest whose order to follow through the café. It only reads the run's records, so going back never changes how
 * the run goes on.
 */
export function ReplayTimeline({
  head,
  time,
  viewing,
  moments,
  roundStarts,
  rounds,
  when,
  crew,
  role,
  programs,
  textMode,
  onView,
  onMoment,
  followable,
  following,
  onFollow,
}: ReplayTimelineProps) {
  const [kind, setKind] = useState<Kind>('all');
  const [said, setSaid] = useState('');
  const pauseWords = useWords(PAUSE_WORDS),
    say = useWords(ROUTE_WORDS);
  const robot = crew.includes(role) ? role : crew[0];
  const shown: Kind = kind === 'handoff' && crew.length < 2 ? 'all' : kind;
  const filter: JumpFilter = shown === 'robot' ? robot : shown;
  const targets = jumpTargets(moments, filter, crew);
  const name = ROBOT_DISPLAY_NAMES[robot];
  // Each kind's label, then its previous and next.
  const kinds: { kind: Kind; words: [string, string, string] }[] = [
    { kind: 'all', words: say.kinds.all },
    { kind: 'order', words: say.kinds.order },
    ...(crew.length > 1 ? [{ kind: 'handoff' as const, words: say.kinds.handoff }] : []),
    { kind: 'robot', words: say.robot(name, textMode) },
  ];
  const [, before, after] = kinds.find((k) => k.kind === shown)!.words;
  const previous = nextMoment(targets, time, -1),
    next = nextMoment(targets, time, 1);
  const at = (seconds: number) => `${(Math.min(Math.max(seconds / head, 0), 1) * 100).toFixed(3)}%`;
  const jump = (moment: Moment | undefined) => {
    if (!moment) {
      onView(null);
      setSaid(`${say.backToNow}.`);
      return;
    }
    onView(landOn(moment));
    onMoment?.(moment);
    const words = momentsAt(targets, moment.at)
      .map((m) => momentWords(m, programs, textMode, pauseWords, say))
      .join('. ');
    setSaid(`${pauseWords.when(rounds, moment.round, moment.event.start)}. ${words}.`);
  };
  const key = (guest: { seed: string; guest: string }) => `${guest.seed}/${guest.guest}`;
  const byRound = rounds > 1 ? [...new Set(followable.map((f) => f.round))] : [];
  const option = (f: Followable) => (
    <option key={key(f)} value={key(f)}>
      {f.label}
    </option>
  );
  const scrub = (seconds: number) => onView(seconds >= head ? null : Math.max(seconds, 0));
  const keys = (e: KeyboardEvent<HTMLInputElement>) => {
    const by = e.shiftKey ? 10 : 1;
    const moves: Record<string, () => void> = {
      ArrowLeft: () => scrub(time - by),
      ArrowDown: () => scrub(time - by),
      ArrowRight: () => scrub(time + by),
      ArrowUp: () => scrub(time + by),
      PageDown: () => scrub(time - 10),
      PageUp: () => scrub(time + 10),
      Home: () => scrub(0),
      End: () => scrub(head),
    };
    // Escape comes back to now, before it can stop the service or leave the shift.
    if (e.key === 'Escape' && viewing) {
      e.stopPropagation();
      moves.End();
    } else if (!moves[e.key]) return;
    else moves[e.key]();
    e.preventDefault();
  };
  return (
    <div className="replay-timeline" role="group" aria-label={say.timeline}>
      <div className="replay-track">
        <div className="replay-marks" aria-hidden="true">
          {roundStarts.map((start) => (
            <span key={start} className="replay-round" style={{ left: at(start) }} />
          ))}
          {targets.map((m, i) => (
            <span key={i} className={`replay-tick ${m.kind}`} style={{ left: at(m.at) }} />
          ))}
        </div>
        <input
          type="range"
          className="replay-scrubber"
          aria-label={say.time}
          aria-valuetext={say.at(when, viewing)}
          aria-keyshortcuts={viewing ? 'Escape' : undefined}
          min={0}
          max={head}
          step={0.1}
          value={Math.max(time, 0)}
          onChange={(e) => scrub(Number(e.target.value))}
          onKeyDown={keys}
        />
      </div>
      <div className="replay-controls">
        <button
          type="button"
          className="replay-jump"
          aria-label={before}
          title={before}
          disabled={!previous}
          onClick={() => jump(previous)}
        >
          <ChevronLeft size={16} aria-hidden="true" />
        </button>
        <span className={'replay-when' + (viewing ? ' earlier' : '')}>{when}</span>
        <button
          type="button"
          className="replay-jump"
          aria-label={next || !viewing ? after : say.nextToNow(after)}
          title={after}
          disabled={!next && !viewing}
          onClick={() => jump(next)}
        >
          <ChevronRight size={16} aria-hidden="true" />
        </button>
        <div className="replay-kinds" role="group" aria-label={say.jumpBetween}>
          {kinds.map((k) => (
            <button key={k.kind} type="button" aria-pressed={shown === k.kind} onClick={() => setKind(k.kind)}>
              {k.words[0]}
            </button>
          ))}
        </div>
        {followable.length > 0 && (
          <select
            className="replay-follow"
            aria-label={say.follow}
            value={following ? key(following) : ''}
            onChange={(e) => {
              const chosen = followable.find((f) => key(f) === e.target.value);
              onFollow(chosen ? { seed: chosen.seed, guest: chosen.guest } : null);
            }}
          >
            <option value="">{following ? say.stop : say.pick}</option>
            {byRound.length
              ? byRound.map((round) => (
                  <optgroup key={round} label={say.round(round)}>
                    {followable.filter((f) => f.round === round).map(option)}
                  </optgroup>
                ))
              : followable.map(option)}
          </select>
        )}
        {viewing && (
          <button type="button" className="replay-now" onClick={() => jump(undefined)}>
            <Undo2 size={14} aria-hidden="true" />
            {say.backToNow}
          </button>
        )}
      </div>
      <p className="sr-only" aria-live="polite">
        {said}
      </p>
    </div>
  );
}
