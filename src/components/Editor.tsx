import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { DndContext, DragOverlay, KeyboardSensor, MeasuringStrategy, useSensor, useSensors } from '@dnd-kit/core';
import {
  robotCommands,
  blockPrototypes,
  indentSource,
  isOpening,
  placeBlock,
  removeVisualBlock,
  spokenBlock,
  tabSource,
  DRAG_SCROLL_EDGE,
  DRAG_SCROLL_SPEED,
  type DraggedScope,
  type RobotRole,
  type VisualBlock,
} from '@/domain';
import { BlockPointerSensor } from '@/hooks/useBlockPointerSensor';
import { useAnnouncement } from '@/hooks/useAnnouncement';
import { useKeyboardCoordinates } from '@/hooks/useKeyboardDropSlot';
import { useDropCollision } from '@/hooks/useCodeCollision';
import { droppedOutside, useBlockDrag } from '@/hooks/useBlockDrag';
import { previewProgramBlocks, useVisibleProgram } from '@/hooks/useVisibleProgram';
import { CommandTile } from './editor/CommandTile';
import { blockHelp, spokenHelp } from './editor/blockHelp';
import { DragPreview, ProjectedBlocks } from './editor/ProjectedBlocks';
import { Insertion } from './editor/Insertion';
import { ProgramRows } from './editor/ProgramRows';
import { insertSpot, spotWords } from './editor/insertSpot';
import { BlockActions, type BlockAction } from './editor/BlockActions';
import { copyBlock, copyBlocker, moveBlock, ordinalIn } from './editor/blockEdits';
import { ProgramSurface } from './editor/ProgramSurface';
import { JumpArrows } from './editor/JumpArrows';
import { dragAnnouncements, dragInstructions } from './editor/dragAnnouncements';
import { ExecutionCursor } from './ExecutionCursor';
import { ROUTINE_PANEL, routineTab } from './RobotChoice';
import { ROBOT_DISPLAY_NAMES, ROBOT_UNLOCK_LEVELS } from '@/domain/robots';
import { pad2 } from '@/shared/lib/format';

/** Where `after` stops differing from `before`, counted in `after`: the end of an undone or redone change. */
function changedEnd(before: string, after: string): number {
  let start = 0;
  while (start < before.length && start < after.length && before[start] === after[start]) start++;
  let end = 0;
  while (
    end < before.length - start &&
    end < after.length - start &&
    before[before.length - 1 - end] === after[after.length - 1 - end]
  )
    end++;
  return after.length - end;
}

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
  /** A `format` edit only lays the routine out again, so undo never stops on it. */
  onChange: (v: string, kind?: 'edit' | 'format') => void;
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
  // A program that has never been indented, such as a shift's starting code, opens in the text view laid out too.
  useEffect(() => {
    if (textMode && !disabled && !/^[ \t]/m.test(source) && indentSource(source) !== source)
      onChange(indentSource(source), 'format');
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
  // A routine that changes under the caret, by an undo or redo, puts the caret at the end of what changed rather
  // than the end of the text. Text the player typed keeps the caret where the browser left it.
  const typed = useRef(source),
    shown = useRef(source);
  useLayoutEffect(() => {
    const before = shown.current;
    shown.current = source;
    const input = textInput.current;
    if (!input) return;
    if (tabCursor.current !== null) {
      input.setSelectionRange(tabCursor.current, tabCursor.current);
      tabCursor.current = null;
    } else if (source !== typed.current && document.activeElement === input) {
      const caret = changedEnd(before, source);
      input.setSelectionRange(caret, caret);
    }
    typed.current = source;
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
  // A block added from the library or removed from the keyboard says so, since neither is otherwise heard.
  const [said, say] = useAnnouncement();
  // A routine block tapped, or picked with Enter, is where library blocks go next instead of the end. It holds only
  // while the routine is the one it was picked in: a drag, an undo or a typed edit moves the lines out from under it.
  const [pick, setPick] = useState<{ line: number; source: string } | null>(null);
  const picked = pick?.source === source && !disabled && !dragged ? rows.find((r) => r.line === pick.line) : undefined;
  const spot = picked && insertSpot(picked);
  const ordinalOf = (line: number) => rows.findIndex((r) => r.line === line) + 1;
  const choose = (block: VisualBlock) => {
    if (block.line === picked?.line) {
      setPick(null);
      say('New blocks go at the end of the routine again.');
    } else {
      setPick({ line: block.line, source });
      say(
        `New blocks go ${spotWords(block, ordinalOf(block.line))}. Pick it again, or press Escape, to add at the end.`,
      );
    }
  };
  // A library block goes after the picked block, or on the end of the routine; focus stays in the library, ready to
  // add the next, which follows the one just added.
  const insert = (command: string) => {
    if (disabled) return;
    const before = source ? source.split('\n').length : 0;
    const at = spot ? spot.at : before;
    const next = indentSource(placeBlock(source, command, at));
    // A new jump also puts its destination at the top, which moves every line down one.
    const shift = next.split('\n').length - before - (isOpening(command) ? 2 : 1);
    const ordinal = rows.filter((r) => r.line < at).length + 1 + shift;
    say(
      `Added block ${ordinal} (${spokenBlock(command)}) ${picked ? spotWords(picked, ordinalOf(picked.line) + shift) : 'at the end of the routine'}.`,
    );
    if (picked) setPick({ line: at + shift, source: next });
    change(next);
  };
  // Focus moves to the block that took a removed one's place, or the one above, or the library once the routine is
  // empty, rather than falling to the page.
  const [removed, setRemoved] = useState<{ line: number } | null>(null);
  const remove = (block: VisualBlock) => {
    const ordinal = rows.findIndex((r) => r.line === block.line) + 1;
    say(`Removed block ${ordinal} (${spokenBlock(block.command)})${block.end > block.line ? ' and its group' : ''}.`);
    setRemoved({ line: block.line });
    blockChange(removeVisualBlock(source, block.line));
  };
  useEffect(() => {
    if (!removed) return;
    const blocks = [...(root.current?.querySelectorAll<HTMLElement>('.block[data-line]') ?? [])];
    const next =
      blocks.find((b) => Number(b.dataset.line) >= removed.line) ??
      blocks.at(-1) ??
      codeArea.current?.parentElement?.querySelector<HTMLElement>('.command-library button:not(:disabled)');
    next?.focus();
  }, [removed]);
  // The picked block's buttons copy, move or remove it whole. A copy or a move stays picked, and focus goes back to
  // the button pressed, so a block can be walked up a routine one press at a time.
  const [pressed, setPressed] = useState<{ action: BlockAction } | null>(null);
  useEffect(() => {
    if (!pressed) return;
    const bar = root.current?.querySelector('.block-actions');
    bar?.querySelector<HTMLElement>(`[data-action="${pressed.action}"]`)?.focus();
  }, [pressed]);
  const act = (block: VisualBlock, action: BlockAction) => {
    if (action === 'remove') return remove(block);
    const ordinal = ordinalOf(block.line);
    const name = `block ${ordinal} (${spokenBlock(block.command)})${block.children ? ' and its group' : ''}`;
    let edited;
    if (action === 'copy') {
      const blocker = copyBlocker(source, block);
      if (blocker) return say(`Block ${ordinal} can’t be copied: ${blocker}.`);
      edited = copyBlock(source, block);
      say(`Copied ${name}. The copy is block ${ordinalIn(edited.source, edited.line)}.`);
    } else {
      edited = moveBlock(source, block, action);
      if (!edited)
        return say(`Block ${ordinal} is already at the ${action === 'up' ? 'top' : 'bottom'} of the routine.`);
      say(`Moved ${name} ${action}. It is block ${ordinalIn(edited.source, edited.line)} now.`);
    }
    setPick(edited);
    setPressed({ action });
    change(edited.source);
  };
  // The library block pointed at or focused, explained in a line over the top of the code.
  const [explained, explain] = useState<string | null>(null);
  const help = explained && !dragged ? blockHelp(explained, role, level) : null;
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
      accessibility={{
        announcements: dragAnnouncements(rows, () => droppedOutside({ codeArea, pointer })),
        screenReaderInstructions: dragInstructions,
      }}
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
                help={spokenHelp(blockHelp(c, role, level))}
                onExplain={explain}
                onChange={insert}
              />
            ))}
          </div>
          {/* The buttons already say this to screen readers; this is the same words for the eye. */}
          {help && (
            <p className="library-help" aria-hidden="true">
              <strong>{help.name}</strong> {help.text}
              {help.example && <span className="library-help-example">For example: {help.example}</span>}
            </p>
          )}
        </section>
        <div
          className="editor-body"
          ref={codeArea}
          onKeyDown={(e) => {
            // Only from a block or the pane itself: Escape in a value's menu just closes the menu.
            if (e.key !== 'Escape' || !picked || !(e.target as Element).matches('.block, .editor-body')) return;
            setPick(null);
            say('New blocks go at the end of the routine again.');
          }}
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
                // The text view's own empty-routine hint: it says what goes here.
                placeholder="One block per line, like LISTEN or MOVE RIGHT 1"
                aria-description={
                  (failureLine >= 0 ? `The service stopped on line ${failureLine + 1}. ` : '') +
                  'Tab indents, Shift+Tab outdents, Escape leaves the editor.'
                }
                onKeyDown={onTextKey}
                value={source}
                onChange={(e) => {
                  typed.current = e.target.value;
                  change(e.target.value);
                }}
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
              {/* An empty routine names both ways in, as the Guide does: a tablet player may never think to drag. */}
              <Insertion
                at={0}
                disabled={disabled}
                hint={rows.length ? '' : 'Tap or click a block in the library, or drag one here'}
              />
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
                remove={remove}
                picked={picked?.line ?? null}
                nextAt={spot ? spot.at : null}
                onPick={choose}
                actions={(block) => (
                  <BlockActions
                    block={block}
                    ordinal={ordinalOf(block.line)}
                    source={source}
                    onAct={(action) => act(block, action)}
                  />
                )}
              />
              <JumpArrows root={root} source={source} dragging={!!dragged} />
            </ProgramSurface>
          )}
        </div>
        <p className="sr-only" role="status">
          {said}
        </p>
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
