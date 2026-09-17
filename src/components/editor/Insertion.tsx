import { useDroppable } from '@dnd-kit/core';
import { useContext } from 'react';
import { BlockIcon } from '../BlockIcon';
import { DragPreview, ProjectedBlocks } from './ProjectedBlocks';

export function Insertion({
  at,
  disabled,
  alternative = false,
  hint = '',
}: {
  at: number;
  disabled: boolean;
  alternative?: boolean;
  hint?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: (alternative ? 'else:' : 'gap:') + at, data: { at, alternative }, disabled });
  const { blocks } = useContext(DragPreview);
  const isElse = hint === 'Else';
  const preview = isOver && !!blocks.length;
  return (
    <div className={'insertion-anchor ' + (hint ? 'with-hint ' : '') + (isElse ? 'else-preview' : '')}>
      <div
        ref={setNodeRef}
        data-drop-slot={(alternative ? 'else:' : 'gap:') + at}
        aria-label={isElse ? 'Else branch drop target' : hint || undefined}
        className={'code-insertion ' + (hint ? 'with-hint ' : '') + (isElse ? 'else-option ' : '') + (isOver ? 'drop-target' : '')}
      >
        {isElse ? (
          <>
            <div className="code-row">
              <div className="block flow">
                <BlockIcon command="ELSE" />
                <strong className="block-verb">Else</strong>
              </div>
            </div>
            <div className="scope-body">
              {preview ? (
                <div className="drop-projection">
                  <ProjectedBlocks blocks={blocks[0]?.command === 'ELSE' ? (blocks[0].children ?? []) : blocks} />
                </div>
              ) : (
                <div className="empty-scope">Drop a block here</div>
              )}
            </div>
          </>
        ) : (
          !preview && hint
        )}
      </div>
      {!isElse && preview && (
        <div className="drop-projection" aria-label="Block placement preview">
          <ProjectedBlocks blocks={blocks} />
        </div>
      )}
    </div>
  );
}
