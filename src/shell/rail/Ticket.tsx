import { Clapperboard, LockKeyhole } from 'lucide-react';
import { sceneBefore, type Cutscene } from '@/data/campaign/cutscenes';
import { pad2, starRow } from '@/shared/lib/format';
import { acts, type Act } from './acts';

export type ActState = 'locked' | 'active' | 'done';

interface TicketProps {
  act: Act;
  number: number;
  state: ActState;
  current: boolean;
  selected: number;
  unlocked: number;
  stars: Record<number, number>;
  titles: string[];
  ordering: number | null;
  /** The shift held back until the scene before it is seen. */
  gated?: number;
  selectedScene?: Cutscene;
  sceneOpen(scene: Cutscene): boolean;
  sceneSeen(scene: Cutscene): boolean;
  onOpen(): void;
  onSelect(index: number): void;
  onStart(index: number): void;
  onSelectScene(scene: Cutscene): void;
  onWatch(scene: Cutscene): void;
}

type Row = { shift: number } | { scene: Cutscene };

/**
 * One act printed as a kitchen order ticket, unrolled into its full list of shifts. Acts not yet
 * reached hang at full length but blank: just the act name and an "Opens soon" stamp.
 */
export function Ticket({
  act,
  number,
  state,
  current,
  selected,
  unlocked,
  stars,
  titles,
  ordering,
  gated,
  selectedScene,
  sceneOpen,
  sceneSeen,
  onOpen,
  onSelect,
  onStart,
  onSelectScene,
  onWatch,
}: TicketProps) {
  const shifts = Array.from({ length: act.to - act.from }, (_, offset) => act.from + offset);
  // Each story scene hangs just above the shift it opens; the closing scene ends the last ticket.
  const closing = number === acts.length - 1 ? sceneBefore(act.to) : undefined;
  const rows: Row[] = shifts.flatMap((shift) => {
    const scene = sceneBefore(shift);
    return scene ? [{ scene }, { shift }] : [{ shift }];
  });
  if (closing) rows.push({ scene: closing });
  const served = shifts.filter((shift) => stars[shift] !== undefined).length;
  const earned = shifts.reduce((sum, shift) => sum + (shift < 2 ? 0 : (stars[shift] ?? 0)), 0);
  const rated = shifts.filter((shift) => shift >= 2).length;
  // A sealed ticket shows only the act name, never the crew or the shift names.
  const sealed = state === 'locked';
  const unlockedBy = acts[number - 1]?.kicker;

  return (
    <article className={`ticket ${state} ${current ? 'current' : ''}`} data-act={number}>
      <span className="ticket-clip" aria-hidden="true" />
      <button
        className="ticket-head"
        disabled={sealed}
        aria-current={current ? 'step' : undefined}
        aria-label={
          sealed
            ? `${act.kicker}, locked until ${unlockedBy} is served`
            : `${act.kicker} · ${act.crew}, ${served} of ${shifts.length} served`
        }
        onClick={onOpen}
      >
        <span className="ticket-shop">
          {current && 'Café Niko · '}Order #{pad2(number + 1)}
        </span>
        {/* Sealed, the act name takes the crew's place; the blank lines keep the head its open height. */}
        <span className="ticket-kicker">{sealed ? '\u00a0' : act.kicker}</span>
        <strong className="ticket-crew">{sealed ? act.kicker : act.crew}</strong>
        <span className="ticket-tagline">{sealed ? '\u00a0' : act.tagline}</span>
      </button>

      {sealed && (
        <span className="ticket-stamp" aria-hidden="true">
          <LockKeyhole size={16} strokeWidth={2.6} />
          Opens soon
        </span>
      )}
      <ol className="ticket-lines" aria-hidden={sealed || undefined}>
        {rows.map((row) => {
          const key = 'scene' in row ? row.scene.id : row.shift;
          // A sealed act keeps one empty line per row, so the ticket hangs as long as it will once open.
          if (sealed)
            return (
              <li key={key}>
                <div className="shift-card" />
              </li>
            );
          if ('scene' in row) return <li key={key}>{sceneLine(row.scene)}</li>;
          const { shift } = row;
          const locked = shift > unlocked || shift === gated;
          const done = stars[shift] !== undefined;
          const classes = [
            'shift-card',
            locked && 'locked',
            done && 'complete',
            !locked && !done && shift === unlocked && 'next',
            selected === shift && 'selected',
            ordering === shift && 'ordering',
          ];
          return (
            <li key={shift}>
              <button
                disabled={locked}
                className={classes.filter(Boolean).join(' ')}
                onClick={() => onSelect(shift)}
                onDoubleClick={() => onStart(shift)}
                // The marks beside the name are visual only, so the label carries the same status.
                aria-label={`Shift ${shift + 1}: ${titles[shift]}${
                  locked
                    ? ', locked'
                    : !done
                      ? shift === unlocked
                        ? ', next up'
                        : ''
                      : shift < 2
                        ? ', served'
                        : `, ${stars[shift]} of 3 stars`
                }`}
                aria-pressed={!locked && selected === shift}
                title={titles[shift]}
              >
                <span className="shift-no">{pad2(shift + 1)}</span>
                <span className="shift-name">{titles[shift]}</span>
                <span className="shift-leader" aria-hidden="true" />
                <span className="shift-mark" aria-hidden="true">
                  {locked ? (
                    <LockKeyhole size={12} strokeWidth={2.4} />
                  ) : !done ? (
                    shift === unlocked ? (
                      'NEXT'
                    ) : (
                      '···'
                    )
                  ) : shift < 2 ? (
                    'OK'
                  ) : (
                    starRow(stars[shift])
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <footer className="ticket-foot" aria-hidden="true">
        <p>
          <span>Served</span>
          <span>
            {served}/{shifts.length}
          </span>
        </p>
        {rated > 0 && (
          <p>
            <span>Stars</span>
            <span>
              {earned}/{rated * 3}
            </span>
          </p>
        )}
        <span className="ticket-barcode" />
        <small>{sealed ? 'Order on hold' : state === 'done' ? 'Thank you, come again' : 'Order in progress'}</small>
      </footer>
    </article>
  );

  /** A story scene on the ticket: a clapperboard instead of a number, and watched rather than served. */
  function sceneLine(scene: Cutscene) {
    const locked = !sceneOpen(scene);
    const seen = !locked && sceneSeen(scene);
    const next = !locked && !seen && scene.before === gated;
    const classes = [
      'shift-card scene-card',
      locked && 'locked',
      seen && 'complete',
      next && 'next',
      selectedScene === scene && 'selected',
    ];
    return (
      <button
        disabled={locked}
        className={classes.filter(Boolean).join(' ')}
        onClick={() => onSelectScene(scene)}
        onDoubleClick={() => onWatch(scene)}
        aria-label={`Scene: ${scene.title}${locked ? ', locked' : next ? ', next up' : seen ? ', seen' : ''}`}
        aria-pressed={!locked && selectedScene === scene}
        title={scene.title}
      >
        <span className="shift-no scene-icon" aria-hidden="true">
          <Clapperboard size={13} strokeWidth={2.2} />
        </span>
        <span className="shift-name">{scene.title}</span>
        <span className="shift-leader" aria-hidden="true" />
        <span className="shift-mark" aria-hidden="true">
          {locked ? <LockKeyhole size={12} strokeWidth={2.4} /> : next ? 'NEXT' : seen ? 'SEEN' : '···'}
        </span>
      </button>
    );
  }
}
