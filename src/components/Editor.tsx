import { useEffect, useLayoutEffect, useRef } from 'react';
import { DndContext, DragOverlay, KeyboardSensor, MeasuringStrategy, useSensor, useSensors } from '@dnd-kit/core';
import {
  robotCommands,
  blockPrototypes,
  indentSource,
  placeBlock,
  tabSource,
  DRAG_SCROLL_EDGE,
  DRAG_SCROLL_SPEED,
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
import { dragAnnouncements, dragInstructions } from './editor/dragAnnouncements';
import { ExecutionCursor } from './ExecutionCursor';
import { ROUTINE_PANEL, routineTab } from './RobotChoice';
import { ROBOT_DISPLAY_NAMES, ROBOT_UNLOCK_LEVELS } from '@/domain/robots';
import { pad2 } from '@/shared/lib/format';

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
  textMode,
  onDismissFailure,
  stepSeconds = 1.5,
  tabbed = false,
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
  onDismissFailure?: () => void;
  /** Under the robot tabs, the code zone is the panel they switch. */
  tabbed?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null),
    codeArea = useRef<HTMLDivElement>(null),
    pointer = useRef<{ x: number; y: number } | null>(null);
  const dragScope = useRef<DraggedScope | undefined>(undefined),
    lastSlot = useRef<string | undefined>(undefined);
  const options = robotCommands(role, level),
    disabled = locked || observation;

  const { tree, rows, elseBlock, visibleFailureLine, markerLine, inLoop } = useVisibleProgram(source, {
    activeLine,
    instructionProgress,
    failureLine,
  });
  const keyboardCoordinates = useKeyboardCoordinates(root, dragScope, lastSlot);
  const sensors = useSensors(
    useSensor(BlockPointerSensor, { activationConstraint: { distance: 6 } }),
    // Space alone lifts a block, so Enter on a library block adds it like a click.
    useSensor(KeyboardSensor, {
      coordinateGetter: keyboardCoordinates,
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space', 'Enter'] },
    }),
  );
  const collisionDetection = useDropCollision({ root, codeArea, pointer, dragScope, lastSlot });
  const change = (value: string) => {
    if (!disabled) onChange(value);
  };
  // Block edits keep the source laid out by depth, so the text view reads like the blocks.
  const blockChange = (value: string) => change(indentSource(value));
  const insert = (command: string) => blockChange(placeBlock(source, command, source ? source.split('\n').length : 0));
  // A program that has never been indented, such as a shift's starting code, opens in the text view laid out too.
  useEffect(() => {
    if (textMode && !disabled && !/^[ \t]/m.test(source) && indentSource(source) !== source)
      onChange(indentSource(source));
    // Only on opening the text view or switching robots: text typed by hand keeps its layout.
  }, [textMode, role]);
  const { dragged, draggedLine, onDragStart, onDragCancel, onDragEnd } = useBlockDrag(
    source,
    rows,
    disabled,
    blockChange,
    {
      codeArea,
      pointer,
      dragScope,
      lastSlot,
    },
  );
  // Tab indents in the text view; the cursor is put back once the new source has rendered.
  const textInput = useRef<HTMLTextAreaElement>(null),
    tabCursor = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (tabCursor.current === null || !textInput.current) return;
    textInput.current.setSelectionRange(tabCursor.current, tabCursor.current);
    tabCursor.current = null;
  }, [source]);
  const onTextKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Tab' || disabled || e.ctrlKey || e.metaKey || e.altKey) return;
    e.preventDefault();
    const { selectionStart, selectionEnd } = e.currentTarget;
    const tabbed = tabSource(source, selectionStart, selectionEnd, e.shiftKey);
    tabCursor.current = tabbed.cursor;
    if (tabbed.source !== source) change(tabbed.source);
    else e.currentTarget.setSelectionRange(tabbed.cursor, tabbed.cursor);
  };
  const previewBlocks = previewProgramBlocks(rows, draggedLine, dragged);
  const lines = source.split('\n');

  return (
    <DndContext
      sensors={sensors}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      // The default scrolls from a fifth of the pane at up to 2000px/s, racing the target past rows.
      autoScroll={{
        threshold: { x: 0, y: DRAG_SCROLL_EDGE },
        acceleration: DRAG_SCROLL_SPEED,
        canScroll: (element) => element === codeArea.current,
      }}
      collisionDetection={collisionDetection}
      accessibility={{ announcements: dragAnnouncements(rows), screenReaderInstructions: dragInstructions }}
      onDragStart={onDragStart}
      onDragCancel={onDragCancel}
      onDragEnd={onDragEnd}
    >
      <DragPreview.Provider value={{ blocks: previewBlocks, options }}>
        <section className="palette compact-palette" aria-label="Available code blocks">
          <div className="command-library">
            {blockPrototypes(options).map((c) => (
              <CommandTile
                key={role + ':' + level + ':' + c}
                initial={c}
                options={options}
                disabled={disabled}
                onChange={insert}
              />
            ))}
          </div>
        </section>
        <div
          className="editor-body"
          ref={codeArea}
          {...(tabbed
            ? { role: 'tabpanel', id: ROUTINE_PANEL, 'aria-labelledby': routineTab(role) }
            : { role: 'group', 'aria-label': 'Code zone' })}
        >
          {observation ? (
            // Without this the watch-only shift's code zone is a blank pane with nothing to say why.
            <p className="observation-note">
              No routine to write today: the crew serves this shift by hand. {ROBOT_DISPLAY_NAMES[role]} joins on Shift{' '}
              {pad2(ROBOT_UNLOCK_LEVELS[role])}.
            </p>
          ) : textMode ? (
            <div className="code-text">
              {/* A copy of the lines under the textarea marks the running or failing line without touching the text. */}
              <div className="code-text-lines" aria-hidden="true">
                {lines.map((line, i) => (
                  <div key={i} className={i === failureLine ? 'failed' : i === markerLine ? 'active' : undefined}>
                    {line || ' '}
                  </div>
                ))}
              </div>
              <textarea
                onClick={failureLine >= 0 ? onDismissFailure : undefined}
                // Routine words aren't English: a touch keyboard must not capitalise or "correct" them.
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                autoComplete="off"
                ref={textInput}
                aria-label="Routine text"
                aria-description="Tab indents, Shift+Tab outdents, Escape leaves the editor."
                onKeyDown={onTextKey}
                value={source}
                onChange={(e) => change(e.target.value)}
                readOnly={locked}
                className="code-input"
              />
            </div>
          ) : (
            <ProgramSurface root={root}>
              <ExecutionCursor
                root={root}
                line={failureLine >= 0 ? visibleFailureLine : markerLine}
                stepSeconds={stepSeconds}
              />
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
                onDismissFailure={onDismissFailure}
                inLoop={inLoop}
                dragged={dragged}
                draggedLine={draggedLine}
                change={blockChange}
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
