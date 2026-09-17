import { useEffect, useRef } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { blockFields, parseStore, type VisualBlock } from '@/domain';
import { BlockIcon } from '../BlockIcon';
import { InstructionError } from '../FailureFeedback';
import { Operands } from './Operands';
import { category } from './blockMeta';

export function Row({
  block,
  depth,
  ordinal,
  locked,
  active,
  failure,
  failureMessage,
  onDismissFailure,
  options,
  onChange,
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
  inLoop?: boolean;
  failureMessage?: string;
  onDismissFailure?: () => void;
}) {
  const { line: id, command } = block;
  const { attributes, listeners, setNodeRef } = useDraggable({ id: String(id), data: { at: id }, disabled: locked });
  const rowRef = useRef<HTMLDivElement | null>(null),
    target = command.startsWith('POSITION ');
  useEffect(() => {
    if (failure) rowRef.current?.parentElement?.scrollIntoView?.({ block: 'nearest', behavior: 'instant' });
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
        aria-label={target ? 'Drag jump destination' : 'Drag block ' + ordinal + ' and its group'}
        aria-disabled={locked}
        tabIndex={locked ? -1 : 0}
        className={['block', category(command), target ? 'jump-target' : '', active ? 'active' : '', failure ? 'failure' : ''].join(' ')}
        aria-current={active && !failure ? 'step' : undefined}
        data-line={id}
        data-depth={depth}
        data-jump={command.startsWith('JUMP ') ? command.slice(5) : undefined}
        data-target={target ? command.slice(9) : undefined}
      >
        {!target && (
          <>
            {!parseStore(command) && (
              <>
                <BlockIcon command={command} />
                <strong className="block-verb">{blockFields(command).verb}</strong>
              </>
            )}
            <Operands command={command} options={options} disabled={locked} label={'Block ' + (id + 1)} inLoop={inLoop} onChange={onChange} />
          </>
        )}
        {target && <span className="sr-only">Jump destination</span>}
      </div>
      {failure && failureMessage && <InstructionError message={failureMessage} anchor={rowRef} />}
    </div>
  );
}
