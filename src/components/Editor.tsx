import { useRef } from 'react';
import { DndContext, DragOverlay, KeyboardSensor, MeasuringStrategy, useSensor, useSensors } from '@dnd-kit/core';
import {
  robotCommands,
  blockPrototypes,
  placeBlock,
  type DraggedScope,
  type RobotRole,
} from '@/domain';
import { BlockPointerSensor } from '@/hooks/useBlockPointerSensor';
import { useKeyboardCoordinates } from '@/hooks/useKeyboardDropSlot';
import { useDropCollision } from '@/hooks/useCodeCollision';
import { useBlockDrag } from '@/hooks/useBlockDrag';
import { previewProgramBlocks, useVisibleProgram } from '@/hooks/useVisibleProgram';
import { CommandTile } from './editor/CommandTile';
import { DragPreview, ProjectedBlocks } from './editor/ProjectedBlocks';
import { Insertion } from './editor/Insertion';
import { ProgramRows } from './editor/ProgramRows';
import { ProgramSurface } from './editor/ProgramSurface';
import { JumpArrows } from './editor/JumpArrows';
import { ExecutionCursor } from './ExecutionCursor';
import { InstructionError } from './FailureFeedback';

export function Editor({
  role = 'query',
  source,
  onChange,
  level,
  locked,
  observation,
  activeLine = -1,
  instructionProgress = 0,
  failureLine = -1,
  failureMessage,
  onEdit,
  textMode,
  onDismissFailure,
  stepSeconds = 1.5,
}: {
  role?: RobotRole;
  source: string;
  onChange: (v: string) => void;
  level: number;
  locked: boolean;
  observation: boolean;
  activeLine?: number;
  instructionProgress?: number;
  failureLine?: number;
  textMode: boolean;
  stepSeconds?: number;
  failureMessage?: string;
  onEdit?: () => void;
  onDismissFailure?: () => void;
}) {
  const root = useRef<HTMLDivElement>(null),
    codeArea = useRef<HTMLDivElement>(null),
    pointer = useRef<{ x: number; y: number } | null>(null);
  const dragScope = useRef<DraggedScope | undefined>(undefined),
    lastSlot = useRef<string | undefined>(undefined);
  const landingX = useRef<number | undefined>(undefined);
  const measuredPointer = useRef<{ x: number; y: number; scrollTop: number; viewportTop: number } | undefined>(undefined);
  const options = robotCommands(role, level),
    disabled = locked || observation;

  const { tree, rows, elseBlock, visibleFailureLine, markerLine, inLoop } = useVisibleProgram(source, {
    activeLine,
    instructionProgress,
    failureLine,
  });
  const keyboardCoordinates = useKeyboardCoordinates(dragScope, lastSlot);
  const sensors = useSensors(
    useSensor(BlockPointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: keyboardCoordinates }),
  );
  const collisionDetection = useDropCollision({ root, codeArea, pointer, dragScope, lastSlot, landingX, measuredPointer });
  const change = (value: string) => {
    if (!disabled) onChange(value);
  };
  const insert = (command: string) => change(placeBlock(source, command, source ? source.split('\n').length : 0));
  const { dragged, draggedLine, onDragStart, onDragCancel, onDragEnd } = useBlockDrag(source, rows, disabled, change, {
    codeArea,
    pointer,
    dragScope,
    lastSlot,
    landingX,
    measuredPointer,
  });
  const previewBlocks = previewProgramBlocks(rows, draggedLine, dragged);

  return (
    <DndContext
      sensors={sensors}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      collisionDetection={collisionDetection}
      onDragStart={onDragStart}
      onDragCancel={onDragCancel}
      onDragEnd={onDragEnd}
    >
      <DragPreview.Provider value={{ blocks: previewBlocks, options }}>
        <section className="palette compact-palette" aria-label="Available code blocks">
          <div className="command-library">
            {blockPrototypes(options).map((c) => (
              <CommandTile key={role + ':' + level + ':' + c} initial={c} options={options} disabled={disabled} onChange={insert} />
            ))}
          </div>
        </section>
        <div className="editor-body" aria-label="Code zone" ref={codeArea}>
          {failureMessage && (textMode || !rows.length) && <InstructionError message={failureMessage} onEdit={locked ? onEdit : undefined} />}
          {observation ? null : textMode ? (
            <textarea
              onClick={failureLine >= 0 ? onDismissFailure : undefined}
              spellCheck={false}
              aria-label="Program source"
              value={source}
              onChange={(e) => change(e.target.value)}
              readOnly={locked}
              className={'code-input ' + (failureLine >= 0 ? 'code-error' : '')}
            />
          ) : (
            <ProgramSurface root={root}>
              <ExecutionCursor root={root} line={failureLine >= 0 ? visibleFailureLine : markerLine} stepSeconds={stepSeconds} />
              <Insertion at={0} disabled={disabled} hint={rows.length ? '' : 'Drop your first block'} />
              <ProgramRows
                tree={tree}
                rows={rows}
                elseBlock={elseBlock}
                options={options}
                disabled={disabled}
                source={source}
                activeLine={activeLine}
                visibleFailureLine={visibleFailureLine}
                failureMessage={failureMessage}
                onDismissFailure={onDismissFailure}
                inLoop={inLoop}
                dragged={dragged}
                draggedLine={draggedLine}
                change={change}
              />
              <JumpArrows root={root} source={source} dragging={!!dragged} />
            </ProgramSurface>
          )}
        </div>
        <DragOverlay dropAnimation={null}>
          {dragged && (
            <div className={'drag-preview floating-code-preview' + (draggedLine === null ? ' from-shop' : '')}>
              <ProjectedBlocks blocks={previewBlocks} />
            </div>
          )}
        </DragOverlay>
      </DragPreview.Provider>
    </DndContext>
  );
}
