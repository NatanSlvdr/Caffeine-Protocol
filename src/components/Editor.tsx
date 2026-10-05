import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { DndContext, DragOverlay, KeyboardSensor, MeasuringStrategy, useSensor, useSensors } from '@dnd-kit/core';
import {
  blockOrdinal,
  canPauseAt,
  compileRobot,
  robotCommands,
  blockPrototypes,
  count,
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
import { carryFolds } from './editor/folds';
import { scopeAround } from './editor/textScope';
import { BlockActions, type BlockAction } from './editor/BlockActions';
import { copyBlock, copyBlocker, moveBlock } from './editor/blockEdits';
import { ProgramSurface } from './editor/ProgramSurface';
import { JumpArrows } from './editor/JumpArrows';
import { dragAnnouncements, dragInstructions } from './editor/dragAnnouncements';
import { ExecutionCursor } from './ExecutionCursor';
import { ROUTINE_PANEL, routineTab } from './RobotChoice';
import { ROBOT_DISPLAY_NAMES, ROBOT_UNLOCK_LEVELS } from '@/domain/robots';
import { pad2 } from '@/shared/lib/format';
import { TriangleAlert, WandSparkles } from 'lucide-react';

const NO_MARKS: ReadonlySet<number> = new Set();

/** How long typing pauses before the text is checked for what would stop it on Run. */
const CHECK_PAUSE_MS = 900;

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
  marks = NO_MARKS,
  onMark,
  onSelect,
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
  /** Blocks marked to pause the service at, by line. */
  marks?: ReadonlySet<number>;
  /** A mark put on a block, or taken off it: by its number, F9, or a click in the text view's gutter. */
  onMark?: (line: number) => void;
  /** The block that took focus, or the line the caret moved to in the text view, for the café to show where it goes. */
  onSelect?: (line: number) => void;
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
  // The line the caret is on while the text view has focus, to match the group around it.
  const [caretLine, setCaretLine] = useState<number | null>(null);
  const trackCaret = (input: HTMLTextAreaElement) => {
    const line = input.value.slice(0, input.selectionStart).split('\n').length - 1;
    setCaretLine(line);
    onSelect?.(line);
  };
  // Tidy up lays the typed routine out by depth again, as one edit that Undo takes back. From the keyboard
  // (Shift+Alt+F, as in code editors), the caret stays on its line, at the same place in the line's words.
  const tidy = (caret?: number) => {
    const tidied = indentSource(source);
    if (tidied === source) return say('The routine is already laid out.');
    if (caret !== undefined) {
      const line = source.slice(0, caret).split('\n').length - 1,
        before = source.split('\n'),
        after = tidied.split('\n');
      const words = Math.max(0, caret - source.lastIndexOf('\n', caret - 1) - 1 - /^\s*/.exec(before[line])![0].length);
      const start = after.slice(0, line).reduce((at, text) => at + text.length + 1, 0);
      tabCursor.current = start + Math.min(after[line].length, /^\s*/.exec(after[line])![0].length + words);
    }
    change(tidied);
    say('Laid the routine out by depth.');
  };
  const onTextKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'F9' && onMark && !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      e.preventDefault();
      const { value, selectionStart } = e.currentTarget;
      return mark(value.slice(0, selectionStart).split('\n').length - 1);
    }
    if (e.code === 'KeyF' && e.altKey && e.shiftKey && !e.ctrlKey && !e.metaKey && !disabled) {
      e.preventDefault();
      return tidy(e.currentTarget.selectionStart);
    }
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
  /** Mark a block to pause the service at, or take its mark off, and say which. */
  const mark = (line: number) => {
    if (!onMark) return;
    const name = textMode ? `line ${line + 1}` : `block ${blockOrdinal(source, line)}`;
    if (!canPauseAt(source, line)) return say(`Nothing starts on ${name} for the service to pause at.`);
    onMark(line);
    say(
      marks.has(line)
        ? `Took the mark off ${name}.`
        : `Marked ${name}: the service pauses as ${ROBOT_DISPLAY_NAMES[role]} starts it.`,
    );
  };
  // A routine block tapped, or picked with Enter, is where library blocks go next instead of the end. It holds only
  // while the routine is the one it was picked in: a drag, an undo or a typed edit moves the lines out from under it.
  const [pick, setPick] = useState<{ line: number; source: string } | null>(null);
  const picked = pick?.source === source && !disabled && !dragged ? rows.find((r) => r.line === pick.line) : undefined;
  const spot = picked && insertSpot(picked);
  const ordinalOf = (line: number) => rows.findIndex((r) => r.line === line) + 1;
  const lines = source.split('\n');
  const scope = textMode && caretLine !== null ? scopeAround(lines, caretLine) : [];
  // What the block on the caret's line does, the library's own help, while the text has focus.
  const caretCommand = caretLine === null ? '' : (lines[caretLine] ?? '').trim();
  const lineHelp =
    textMode && caretCommand && !caretCommand.startsWith('#') ? blockHelp(caretCommand, role, level) : null;
  // Groups folded shut, so a long routine reads at a glance. Folds follow their lines through edits and are this
  // robot's own; a group holding the running block or the failure shows it, folded or not.
  const [folds, setFolds] = useState({ role, source, lines: new Set<number>() as ReadonlySet<number> });
  let folded = folds.lines;
  if (folds.role !== role || folds.source !== source) {
    folded = folds.role === role ? carryFolds(folds.source, source, folds.lines) : new Set();
    setFolds({ role, source, lines: folded });
  }
  const revealed = [markerLine, visibleFailureLine];
  const isFolded = (block: VisualBlock) =>
    folded.has(block.line) && !revealed.some((line) => line > block.line && line <= block.end);
  const inside = (block: VisualBlock) => rows.filter((r) => r.line > block.line && r.line <= block.end).length;
  const fold = (block: VisualBlock) => {
    const lines = new Set(folded);
    const closing = !lines.delete(block.line);
    if (closing) lines.add(block.line);
    setFolds({ role, source, lines });
    const name = `block ${ordinalOf(block.line)} (${spokenBlock(block.command)})`;
    say(closing ? `Folded ${name}, with ${count(inside(block), 'block')} inside.` : `Unfolded ${name}.`);
    // A pick out of sight would take new blocks where they can't be seen.
    if (closing && picked && picked.line > block.line && picked.line <= block.end) setPick(null);
  };
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
  // A jump or a call takes the player to where it goes: the landing spot, or the function, opened if folded away.
  const [goal, setGoal] = useState<{ line: number } | null>(null);
  useEffect(() => {
    if (!goal) return;
    const target = root.current?.querySelector<HTMLElement>(`.block[data-line="${goal.line}"]`);
    target?.scrollIntoView?.({ block: 'center', behavior: 'instant' });
    target?.focus();
  }, [goal]);
  const goTo = (block: VisualBlock) => {
    const [verb, ...name] = block.command.split(' ');
    const want = { JUMP: 'POSITION ', CALL: 'FUNCTION ' }[verb];
    const target = want && rows.find((r) => r.command === want + name.join(' '));
    if (!target) return;
    const where = `block ${ordinalOf(target.line)} (${spokenBlock(target.command)})`;
    return {
      label: verb === 'JUMP' ? `Go to where the jump lands, ${where}` : `Go to ${where}`,
      title: verb === 'JUMP' ? 'Go to where it lands' : 'Go to the function',
      onGo: () => reveal(target.line, where),
    };
  };
  // Focus a block, opening any folded group it is in first, and say which opened.
  const reveal = (line: number, where: string) => {
    const hiding = rows.filter((r) => folded.has(r.line) && r.line < line && line <= r.end);
    if (hiding.length) {
      setFolds({ role, source, lines: new Set([...folded].filter((at) => !hiding.some((r) => r.line === at))) });
      say(
        `Unfolded ${hiding.map((r) => `block ${ordinalOf(r.line)} (${spokenBlock(r.command)})`).join(' and ')} to show ${where}.`,
      );
    }
    setGoal({ line });
  };
  // What would stop the routine as soon as it ran, said before Run: the compiler's own verdict, never a guess, so any
  // routine it accepts goes unremarked. Typed text is checked once the typing pauses, so a half-written line is left
  // to be finished; blocks are always whole, so they are checked as they change.
  const [settled, settle] = useState(source);
  useEffect(() => {
    const wait = setTimeout(() => settle(source), CHECK_PAUSE_MS);
    return () => clearTimeout(wait);
  }, [source]);
  const verdict = useMemo(() => compileRobot(source, role, level), [source, role, level]);
  const problem =
    !disabled &&
    source.trim() &&
    failureLine < 0 &&
    activeLine < 0 &&
    (!textMode || settled === source) &&
    verdict.compile_error
      ? { line: verdict.error_line, message: verdict.compile_error }
      : null;
  const problemAt =
    problem &&
    (textMode ? `Line ${problem.line + 1}` : ordinalOf(problem.line) ? `Block ${ordinalOf(problem.line)}` : '');
  const showProblem = () => {
    if (!problem) return;
    if (textMode) {
      const input = textInput.current;
      if (!input) return;
      const start = lines.slice(0, problem.line).reduce((at, line) => at + line.length + 1, 0);
      input.focus();
      input.setSelectionRange(start, start + (lines[problem.line] ?? '').length);
      return;
    }
    const block = rows.find((r) => r.line === problem.line);
    if (block) reveal(block.line, `block ${ordinalOf(block.line)} (${spokenBlock(block.command)})`);
  };
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
      say(`Copied ${name}. The copy is block ${blockOrdinal(edited.source, edited.line)}.`);
    } else {
      edited = moveBlock(source, block, action);
      if (!edited)
        return say(`Block ${ordinal} is already at the ${action === 'up' ? 'top' : 'bottom'} of the routine.`);
      say(`Moved ${name} ${action}. It is block ${blockOrdinal(edited.source, edited.line)} now.`);
    }
    setPick(edited);
    setPressed({ action });
    change(edited.source);
  };
  // The library block pointed at or focused, explained in a line over the top of the code.
  const [explained, explain] = useState<string | null>(null);
  const help = explained && !dragged ? blockHelp(explained, role, level) : null;
  const previewBlocks = previewProgramBlocks(rows, draggedLine, dragged);
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
          onFocus={(e) => {
            const block = (e.target as Element).closest<HTMLElement>('.block[data-line]');
            if (block) onSelect?.(Number(block.dataset.line));
          }}
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
                  <div
                    key={i}
                    className={
                      [
                        i === failureLine
                          ? 'failed'
                          : i === markerLine
                            ? 'active'
                            : i === problem?.line
                              ? 'flagged'
                              : '',
                        marks.has(i) ? 'marked' : '',
                        scope.includes(i) ? 'scope-edge' : i > scope[0] && i < scope.at(-1)! ? 'in-scope' : '',
                      ]
                        .filter(Boolean)
                        .join(' ') || undefined
                    }
                  >
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
                  (problem ? `Line ${problem.line + 1} needs a fix before Run: ${problem.message} ` : '') +
                  (onMark ? 'F9 marks the line for the service to pause at. ' : '') +
                  'Tab indents, Shift+Tab outdents, Shift+Alt+F tidies the layout, Escape leaves the editor.'
                }
                onKeyDown={onTextKey}
                // The gutter, where the numbers are, marks a line to pause at, as a block's number does.
                onMouseDown={(e) => {
                  if (!onMark || e.button !== 0 || e.clientX - e.currentTarget.getBoundingClientRect().left > 44)
                    return;
                  const numbered = [...(e.currentTarget.previousElementSibling?.children ?? [])];
                  const line = numbered.findIndex((row) => {
                    const box = row.getBoundingClientRect();
                    return e.clientY >= box.top && e.clientY < box.bottom;
                  });
                  if (line < 0) return;
                  e.preventDefault();
                  mark(line);
                }}
                onSelect={(e) => trackCaret(e.currentTarget)}
                onFocus={(e) => trackCaret(e.currentTarget)}
                onBlur={() => setCaretLine(null)}
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
                isFolded={isFolded}
                inside={inside}
                onFold={fold}
                goTo={goTo}
                flaggedLine={problem?.line ?? -1}
                marks={marks}
                onMark={onMark && mark}
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
        {textMode && !observation && (
          <div className="text-tools">
            <p className="text-help">
              {lineHelp?.text && (
                <>
                  <strong>{lineHelp.name}</strong> {lineHelp.text}
                </>
              )}
            </p>
            {!disabled && (
              <button type="button" onClick={() => tidy()} aria-keyshortcuts="Shift+Alt+F" title="Shift+Alt+F">
                <WandSparkles size={13} aria-hidden="true" />
                Tidy up
              </button>
            )}
          </div>
        )}
        {problem && (
          <div className="routine-check">
            <TriangleAlert size={14} aria-hidden="true" />
            <p>
              {problemAt && <strong>{problemAt}: </strong>}
              {problem.message}
            </p>
            {(textMode || ordinalOf(problem.line) > 0) && (
              <button type="button" onClick={showProblem}>
                Show
              </button>
            )}
          </div>
        )}
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
