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
  failureMessage?: string;
  onDismissFailure?: () => void;
  inLoop: (line: number) => boolean;
  dragged: string;
  draggedLine: number | null;
  change: (value: string) => void;
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
  failureMessage,
  onDismissFailure,
  inLoop,
  dragged,
  draggedLine,
  change,
}: ProgramRowsProps) {
  const renderBlocks = (blocks: VisualBlock[], depth = 0): React.ReactNode =>
    blocks.map((block) => (
      <div
        className={
          (block.children ? 'code-scope ' + category(block.command) : 'code-statement') + (draggedLine === block.line ? ' drag-source' : '')
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
          failureMessage={failureMessage}
          onDismissFailure={onDismissFailure}
          onChange={(c) => {
            const lines = source.split('\n');
            lines[block.line] = c;
            change(lines.join('\n'));
          }}
        />
        {block.children && (
          <div className="scope-body">
            <Insertion at={block.line + 1} disabled={disabled} hint={block.children.length ? '' : 'Drop a block here'} />
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
              failureMessage={failureMessage}
              onDismissFailure={onDismissFailure}
              onChange={() => {}}
            />
            <div className="scope-body">
              <Insertion at={block.elseLine! + 1} disabled={disabled} />
              {renderBlocks(block.alternative, depth + 1)}
            </div>
          </div>
        )}
        {block.command.startsWith('IF ') && !block.alternative?.length && dragged && (
          <Insertion at={block.end} alternative={block.elseLine === undefined} disabled={disabled} hint="Else" />
        )}
        <Insertion at={block.end + 1} disabled={disabled} />
      </div>
    ));
  return <>{renderBlocks(tree)}</>;
}
