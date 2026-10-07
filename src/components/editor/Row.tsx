import { useEffect, useRef } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { ChevronDown, ChevronRight, Crosshair } from 'lucide-react';
import { blockFields, parseStore, type VisualBlock } from '@/domain';
import { useWords } from '@/shared/language';
import { BlockIcon } from '../BlockIcon';
import { Operands } from './Operands';
import { category } from './blockMeta';
import { EDITOR_WORDS } from './editorWords';
import { useLifting } from './lifting';

/** A button on a jump or a call that goes to its landing spot or its function. */
export interface GoTo {
  label: string;
  title: string;
  onGo: () => void;
}

export function Row({
  block,
  depth,
  ordinal,
  locked,
  active,
  failure,
  onDismissFailure,
  options,
  onChange,
  onRemove,
  inLoop = false,
  picked = false,
  onPick,
  actions,
  fold,
  goTo,
  flagged = false,
  marked = false,
  onMark,
}: {
  block: VisualBlock;
  depth: number;
  ordinal: number;
  locked: boolean;
  active: boolean;
  failure: boolean;
  options: string[];
  onChange: (c: string) => void;
  /** Delete or Backspace on the focused block takes it, and its group, out of the routine. */
  onRemove?: () => void;
  inLoop?: boolean;
  onDismissFailure?: () => void;
  /** Library blocks are added after this one, rather than at the end. */
  picked?: boolean;
  /** A tap on the block itself, or Enter, picks it as the place library blocks go; again, and they go at the end. */
  onPick?: () => void;
  /** Buttons shown beside the block while it's picked. */
  actions?: React.ReactNode;
  /** A group with blocks in it folds shut to its first block, and says how many it hides. */
  fold?: { folded: boolean; inside: number; onToggle: () => void };
  goTo?: GoTo;
  /** Where the routine would stop as soon as it ran, marked before Run. */
  flagged?: boolean;
  /** Marked to pause the service at, as the robot starts it. */
  marked?: boolean;
  /** The block's number, or F9 on the block, marks it or takes its mark off; even while the service runs. */
  onMark?: () => void;
}) {
  const pickable = !locked && !!onPick;
  const { line: id, command } = block;
  const { attributes, listeners, setNodeRef } = useDraggable({ id: String(id), data: { at: id }, disabled: locked });
  const lifting = useLifting(String(id));
  const say = useWords(EDITOR_WORDS);
  const rowRef = useRef<HTMLDivElement | null>(null),
    target = command.startsWith('POSITION ');
  useEffect(() => {
    if (failure) rowRef.current?.parentElement?.scrollIntoView?.({ block: 'center', behavior: 'instant' });
  }, [failure]);
  return (
    <div className="code-row" onClickCapture={failure ? onDismissFailure : undefined}>
      {onMark ? (
        // Out of the tab order, so the routine isn't twice as many stops long: F9 on the block does the same.
        <button
          type="button"
          tabIndex={-1}
          className={'line-number' + (marked ? ' marked' : '')}
          style={{ left: -(depth * 42 + 35) }}
          aria-pressed={marked}
          aria-label={say.row.pauseAt(ordinal)}
          title={marked ? say.row.pauses : say.row.pause}
          onClick={onMark}
        >
          {String(ordinal).padStart(2, '0')}
        </button>
      ) : (
        <span className="line-number" style={{ left: -(depth * 42 + 35) }} aria-hidden="true">
          {String(ordinal).padStart(2, '0')}
        </span>
      )}
      <div
        ref={(node) => {
          setNodeRef(node);
          rowRef.current = node;
        }}
        {...attributes}
        {...listeners}
        onClick={(e) => {
          // Its fields keep their clicks: only the block's own face picks it.
          const field = (e.target as Element).closest(
            'input, select, textarea, button, [role="combobox"], [role="option"]',
          );
          if (pickable && (!field || field === e.currentTarget)) onPick?.();
        }}
        onKeyDown={(e) => {
          listeners?.onKeyDown?.(e);
          if (e.key === 'Enter' && e.target === e.currentTarget && pickable) {
            e.preventDefault();
            onPick?.();
          }
          // Only the block itself: its own fields keep Backspace for their text.
          if ((e.key === 'Delete' || e.key === 'Backspace') && e.target === e.currentTarget && !locked && onRemove) {
            e.preventDefault();
            onRemove();
          }
          if (e.key === 'F9' && e.target === e.currentTarget && onMark) {
            e.preventDefault();
            onMark();
          }
        }}
        aria-keyshortcuts={
          [onMark && 'F9', !locked && onRemove && 'Delete Backspace'].filter(Boolean).join(' ') || undefined
        }
        // The failure's red is drawn only, so the name says it too, once the crew's dialogue has gone.
        aria-label={
          (target ? say.row.dragTarget(command) : say.row.drag(ordinal, command, block.end > block.line)) +
          (failure ? say.row.failed : '') +
          (flagged && !failure ? say.row.flagged : '') +
          (marked ? say.row.marked : '') +
          (fold?.folded ? say.row.folded(fold.inside) : '') +
          (picked ? say.row.picked : '')
        }
        aria-disabled={locked}
        tabIndex={locked ? -1 : 0}
        className={[
          'block',
          category(command),
          target ? 'jump-target' : '',
          active ? 'active' : '',
          failure ? 'failure' : '',
          flagged && !failure ? 'flagged' : '',
          picked ? 'picked' : '',
          lifting ? 'lifting' : '',
        ].join(' ')}
        aria-current={active && !failure ? 'step' : undefined}
        data-line={id}
        data-depth={depth}
        data-jump={command.startsWith('JUMP ') ? command.slice(5) : undefined}
        data-target={target ? command.slice(9) : undefined}
        title={target ? say.row.target : undefined}
      >
        {!target && (
          <>
            {!parseStore(command) && (
              <>
                <BlockIcon command={command} />
                <strong className="block-verb">{blockFields(command).verb}</strong>
              </>
            )}
            <Operands
              command={command}
              options={options}
              disabled={locked}
              label={say.actions.block(ordinal)}
              inLoop={inLoop}
              onChange={onChange}
            />
          </>
        )}
        {target && (
          <>
            <BlockIcon command={command} />
            <span className="sr-only">{say.row.destination}</span>
          </>
        )}
        {goTo && (
          <button type="button" className="block-go" aria-label={goTo.label} title={goTo.title} onClick={goTo.onGo}>
            <Crosshair size={13} aria-hidden="true" />
          </button>
        )}
        {fold && (
          <button
            type="button"
            className="block-fold"
            aria-expanded={!fold.folded}
            aria-label={say.row.fold(fold.folded, ordinal)}
            title={say.row.foldTitle(fold.folded, fold.inside)}
            onClick={fold.onToggle}
          >
            {fold.folded ? <ChevronRight size={13} aria-hidden="true" /> : <ChevronDown size={13} aria-hidden="true" />}
            {fold.folded && <span aria-hidden="true">{fold.inside}</span>}
          </button>
        )}
      </div>
      {actions}
    </div>
  );
}
