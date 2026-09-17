import { createContext, useContext } from 'react';
import { blockFields, parseStore, type VisualBlock } from '@/domain';
import { BlockIcon } from '../BlockIcon';
import { Operands } from './Operands';
import { category } from './blockMeta';

export const DragPreview = createContext<{ blocks: VisualBlock[]; options: string[] }>({ blocks: [], options: [] });

/** The landing preview uses the same rows and nested spacing as the committed program. */
export function ProjectedBlocks({ blocks }: { blocks: VisualBlock[] }) {
  const { options } = useContext(DragPreview);
  return blocks.map((block) => (
    <div key={block.line} className={block.children ? 'code-scope ' + category(block.command) : 'code-statement'}>
      <div className="code-row">
        <div
          className={'block ' + category(block.command) + (block.command.startsWith('POSITION ') ? ' jump-target' : '')}
          data-jump={block.command.startsWith('JUMP ') ? block.command.slice(5) : undefined}
          data-target={block.command.startsWith('POSITION ') ? block.command.slice(9) : undefined}
          data-line={block.line}
        >
          {!block.command.startsWith('POSITION ') && (
            <>
              {!parseStore(block.command) && (
                <>
                  <BlockIcon command={block.command} />
                  <strong className="block-verb">{blockFields(block.command).verb}</strong>
                </>
              )}
              <Operands command={block.command} options={options} disabled label="Preview" onChange={() => {}} />
            </>
          )}
        </div>
      </div>
      {block.children && (
        <div className="scope-body">
          {block.children.length ? <ProjectedBlocks blocks={block.children} /> : <div className="empty-scope">Drop a block here</div>}
        </div>
      )}
      {!!block.alternative?.length && (
        <>
          <div className="code-row">
            <div className="block flow">
              <BlockIcon command="ELSE" />
              <strong className="block-verb">Else</strong>
            </div>
          </div>
          <div className="scope-body">
            <ProjectedBlocks blocks={block.alternative} />
          </div>
        </>
      )}
    </div>
  ));
}
