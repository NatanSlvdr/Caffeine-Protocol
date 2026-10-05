import { useEffect, useId, useRef, useState } from 'react';
import { CircleDot } from 'lucide-react';
import { count } from '@/domain';
import type { PauseAt } from './breakpoints';

export interface PauseAtMenuProps {
  pauseAt: PauseAt;
  onPauseAt: (next: PauseAt) => void;
  /** How many blocks the player's robots are marked to pause at. */
  marks: number;
  onClearMarks: () => void;
  /** Brew or Porter is in the crew, so there are tickets handed over to pause at. */
  handoffs: boolean;
  /** The routines show as text, so a mark goes on a line rather than a block. */
  textMode: boolean;
}

/**
 * Where the service pauses by itself, set before a run or while one plays: the marked blocks, which it says how to
 * make and can clear, each handoff, and a slip, held before the crew reacts.
 */
export function PauseAtMenu({ pauseAt, onPauseAt, marks, onClearMarks, handoffs, textMode }: PauseAtMenuProps) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null),
    trigger = useRef<HTMLButtonElement>(null);
  const menu = useId();
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);
  const set = marks + Number(handoffs && pauseAt.handoffs) + Number(pauseAt.slips);
  const where = textMode
    ? 'Click a line number, or press F9 on a line, to mark it.'
    : 'Click a block’s number, or press F9 on a block, to mark it.';
  return (
    <div
      className="pause-at"
      ref={root}
      onKeyDown={(e) => {
        // Escape closes the menu here, before it can stop the service or leave the shift.
        if (e.key !== 'Escape' || !open) return;
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
        trigger.current?.focus();
      }}
    >
      <button
        ref={trigger}
        type="button"
        className="pause-at-button"
        aria-expanded={open}
        aria-controls={open ? menu : undefined}
        aria-label={`Pause at${set ? `, ${count(set, 'setting')} on` : ''}`}
        title="Where the service pauses by itself"
        onClick={() => setOpen((o) => !o)}
      >
        <CircleDot size={15} aria-hidden="true" />
        <span className="step-label">Pause at</span>
        {set > 0 && (
          <span className="pause-at-count" aria-hidden="true">
            {set}
          </span>
        )}
      </button>
      {open && (
        <div className="pause-at-menu" id={menu} role="group" aria-label="Pause the service by itself">
          <p className="pause-at-title">Pause the service by itself</p>
          <div className="pause-at-marks">
            <p>
              <strong>
                {marks ? `At ${count(marks, textMode ? 'marked line' : 'marked block')}` : 'No marks yet'}
              </strong>
              <span>{where}</span>
            </p>
            {marks > 0 && (
              <button type="button" aria-label="Clear marks" onClick={onClearMarks}>
                Clear
              </button>
            )}
          </div>
          {handoffs && (
            <label>
              <input
                type="checkbox"
                checked={pauseAt.handoffs}
                onChange={(e) => onPauseAt({ ...pauseAt, handoffs: e.target.checked })}
              />
              <span>
                Every handoff
                <small>When Brew takes a ticket, or Porter a drink</small>
              </span>
            </label>
          )}
          <label>
            <input
              type="checkbox"
              checked={pauseAt.slips}
              onChange={(e) => onPauseAt({ ...pauseAt, slips: e.target.checked })}
            />
            <span>
              A slip
              <small>Look around the moment it goes wrong, before the crew reacts</small>
            </span>
          </label>
        </div>
      )}
    </div>
  );
}
