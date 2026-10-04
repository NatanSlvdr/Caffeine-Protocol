import { useEffect, useState } from 'react';
import type { VisualBlock } from '@/domain';
import { category } from './blockMeta';
import { Insertion } from './Insertion';
import { Row } from './Row';

export interface ProgramRowsProps {
  tree: VisualBlock[];
  rows: VisualBlock[];
  elseBlock: (block: VisualBlock) => VisualBlock;
  options: string[];
  disabled: boolean;
  source: string;
  activeLine: number;
  visibleFailureLine: number;
  onDismissFailure?: () => void;
  inLoop: (line: number) => boolean;
  dragged: string;
  draggedLine: number | null;
  change: (value: string) => void;
  remove: (block: VisualBlock) => void;
  /** The routine block library blocks are added after, and the line the next one takes. */
  picked: number | null;
  nextAt: number | null;
  onPick: (block: VisualBlock) => void;
  /** The picked block's own buttons. */
  actions: (block: VisualBlock) => React.ReactNode;
}

/** Recursive visual rows with insertion anchors, else branches, and jump slots. */
export function ProgramRows({
  tree,
  rows,
  elseBlock,
  options,
  disabled,
  source,
  activeLine,
  visibleFailureLine,
  onDismissFailure,
  inLoop,
  dragged,
  draggedLine,
  change,
  remove,
  picked,
  nextAt,
  onPick,
  actions,
}: ProgramRowsProps) {
  // Else slots open a frame after the pickup. Opened in the same render, they push the blocks below
  // an If down before the drag measures the picked block, and the floating copy trails the pointer.
  const [elseSlots, setElseSlots] = useState(false);
  useEffect(() => {
    if (!dragged) return setElseSlots(false);
    const frame = requestAnimationFrame(() => setElseSlots(true));
    return () => cancelAnimationFrame(frame);
  }, [!!dragged]);
  const renderBlocks = (blocks: VisualBlock[], depth = 0): React.ReactNode =>
    blocks.map((block) => (
      <div
        className={
          (block.children ? 'code-scope ' + category(block.command) : 'code-statement') +
          (draggedLine === block.line ? ' drag-source' : '')
        }
        key={block.line}
      >
        <Row
          block={block}
          inLoop={inLoop(block.line)}
          depth={depth}
          ordinal={rows.findIndex((r) => r.line === block.line) + 1}
          options={options}
          locked={disabled}
          active={activeLine === block.line}
          failure={visibleFailureLine === block.line}
          onDismissFailure={onDismissFailure}
          onChange={(c) => {
            const lines = source.split('\n');
            lines[block.line] = c;
            change(lines.join('\n'));
          }}
          onRemove={() => remove(block)}
          picked={picked === block.line}
          onPick={dragged ? undefined : () => onPick(block)}
          actions={picked === block.line ? actions(block) : undefined}
        />
        {block.children && (
          <div className="scope-body">
            <Insertion
              at={block.line + 1}
              disabled={disabled}
              hint={block.children.length ? '' : 'Drop a block here'}
              next={nextAt === block.line + 1}
            />
            {renderBlocks(block.children, depth + 1)}
          </div>
        )}
        {!!block.alternative?.length && (
          <div className={'else-body' + (draggedLine === block.elseLine ? ' drag-source' : '')}>
            <Row
              block={elseBlock(block)}
              depth={depth}
              ordinal={rows.findIndex((r) => r.line === block.elseLine) + 1}
              options={options}
              locked={disabled}
              active={activeLine === block.elseLine}
              failure={visibleFailureLine === block.elseLine}
              onDismissFailure={onDismissFailure}
              onChange={() => {}}
              onRemove={() => remove(elseBlock(block))}
              picked={picked === block.elseLine}
              onPick={dragged ? undefined : () => onPick(elseBlock(block))}
              actions={picked === block.elseLine ? actions(elseBlock(block)) : undefined}
            />
            <div className="scope-body">
              <Insertion at={block.elseLine! + 1} disabled={disabled} next={nextAt === block.elseLine! + 1} />
              {renderBlocks(block.alternative, depth + 1)}
            </div>
          </div>
        )}
        {block.command.startsWith('IF ') && !block.alternative?.length && dragged && elseSlots && (
          <Insertion at={block.end} alternative={block.elseLine === undefined} disabled={disabled} hint="Else" />
        )}
        <Insertion at={block.end + 1} disabled={disabled} next={nextAt === block.end + 1} />
      </div>
    ));
  return <>{renderBlocks(tree)}</>;
}
