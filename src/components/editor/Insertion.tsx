import { useDroppable } from '@dnd-kit/core';
import { useContext } from 'react';
import { useWords } from '@/shared/language';
import { BlockIcon } from '../BlockIcon';
import { DragPreview, ProjectedBlocks } from './ProjectedBlocks';
import { EDITOR_WORDS } from './editorWords';

export function Insertion({
  at,
  disabled,
  alternative = false,
  hint = '',
  next = false,
}: {
  at: number;
  disabled: boolean;
  alternative?: boolean;
  hint?: string;
  /** Marks where the next library block goes, once a routine block is picked. */
  next?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: (alternative ? 'else:' : 'gap:') + at,
    data: { at, alternative },
    disabled,
  });
  const { blocks } = useContext(DragPreview);
  const say = useWords(EDITOR_WORDS);
  const isElse = hint === 'Else';
  const preview = isOver && !!blocks.length;
  // The anchor is the droppable: its top edge is exactly where a dropped block's top lands.
  return (
    <div
      ref={setNodeRef}
      data-drop-slot={(alternative ? 'else:' : 'gap:') + at}
      className={'insertion-anchor ' + (hint ? 'with-hint ' : '') + (isElse ? 'else-preview' : '')}
    >
      {/* The hint is printed in the slot, so it reads as it shows; a plain div can't carry a label of its own. */}
      <div
        className={
          'code-insertion ' +
          (hint ? 'with-hint ' : '') +
          (isElse ? 'else-option ' : '') +
          (isOver ? 'drop-target ' : '') +
          (next ? 'next-spot' : '')
        }
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
                <div className="empty-scope">{say.dropHere}</div>
              )}
            </div>
          </>
        ) : (
          !preview && (next && hint ? say.nextHere : hint)
        )}
      </div>
      {!isElse && preview && (
        <div className="drop-projection" aria-hidden="true">
          <ProjectedBlocks blocks={blocks} />
        </div>
      )}
    </div>
  );
}
