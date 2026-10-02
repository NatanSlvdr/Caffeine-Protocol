import { useEffect, useRef } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { blockFields, parseStore, spokenBlock, type VisualBlock } from '@/domain';
import { BlockIcon } from '../BlockIcon';
import { Operands } from './Operands';
import { category } from './blockMeta';

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
}) {
  const { line: id, command } = block;
  const { attributes, listeners, setNodeRef } = useDraggable({ id: String(id), data: { at: id }, disabled: locked });
  const rowRef = useRef<HTMLDivElement | null>(null),
    target = command.startsWith('POSITION ');
  useEffect(() => {
    if (failure) rowRef.current?.parentElement?.scrollIntoView?.({ block: 'center', behavior: 'instant' });
  }, [failure]);
  return (
    <div className="code-row" onClickCapture={failure ? onDismissFailure : undefined}>
      <span className="line-number" style={{ left: -(depth * 42 + 35) }} aria-hidden="true">
        {String(ordinal).padStart(2, '0')}
      </span>
      <div
        ref={(node) => {
          setNodeRef(node);
          rowRef.current = node;
        }}
        {...attributes}
        {...listeners}
        onKeyDown={(e) => {
          listeners?.onKeyDown?.(e);
          // Only the block itself: its own fields keep Backspace for their text.
          if ((e.key === 'Delete' || e.key === 'Backspace') && e.target === e.currentTarget && !locked && onRemove) {
            e.preventDefault();
            onRemove();
          }
        }}
        aria-keyshortcuts={locked || !onRemove ? undefined : 'Delete Backspace'}
        // The failure's red is drawn only, so the name says it too, once the crew's dialogue has gone.
        aria-label={
          (target
            ? `Drag ${spokenBlock(command)}`
            : `Drag block ${ordinal} (${spokenBlock(command)})${block.end > block.line ? ' and its group' : ''}`) +
          (failure ? ', where the service stopped' : '')
        }
        aria-disabled={locked}
        tabIndex={locked ? -1 : 0}
        className={[
          'block',
          category(command),
          target ? 'jump-target' : '',
          active ? 'active' : '',
          failure ? 'failure' : '',
        ].join(' ')}
        aria-current={active && !failure ? 'step' : undefined}
        data-line={id}
        data-depth={depth}
        data-jump={command.startsWith('JUMP ') ? command.slice(5) : undefined}
        data-target={target ? command.slice(9) : undefined}
        title={target ? 'The jump lands here. Drag to move it.' : undefined}
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
              label={'Block ' + ordinal}
              inLoop={inLoop}
              onChange={onChange}
            />
          </>
        )}
        {target && (
          <>
            <BlockIcon command={command} />
            <span className="sr-only">Jump destination</span>
          </>
        )}
      </div>
    </div>
  );
}
