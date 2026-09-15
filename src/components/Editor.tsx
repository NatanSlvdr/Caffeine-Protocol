import { useRef, useState, useEffect, useId, createContext, useContext } from 'react';
import { DndContext, DragOverlay, useDndContext, KeyboardSensor, MeasuringStrategy, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import type { KeyboardCoordinateGetter } from '@dnd-kit/core';
import type { RobotRole } from '../domain/types';
import { robotCommands } from '../domain/robotProgram';
import { blockFields, blockPrototypes, blockVariants } from '../domain/blockFields';
import { normalizeDirection } from '../domain/directions';
import { placeBlock, removeVisualBlock, visualProgram } from '../domain/visualProgram';
import type { VisualBlock } from '../domain/visualProgram';
import { BlockSelect, DirectionSelect } from './BlockSelect';
import { BlockIcon } from './BlockIcon';
import { OperandIcon } from './OperandIcon';
import { InstructionError } from './FailureFeedback';
import { keyboardDropSlot, pickDropSlot } from '../domain/dragPlacement';
import type { DraggedScope } from '../domain/dragPlacement';

/** Drag the whole tile while leaving operand controls to handle their own input. */
class BlockPointerSensor extends PointerSensor {
  static activators = [{ eventName: 'onPointerDown' as const, handler: (event: React.PointerEvent, options: ConstructorParameters<typeof PointerSensor>[0]['options']) => {
    if ((event.target as HTMLElement).closest('input, [role="combobox"]')) return false;
    return PointerSensor.activators[0].handler(event, options);
  } }];
}

function category(command: string) {
  const family = blockFields(command).family;
  return ['FUNCTION', 'CALL', 'RETURN'].includes(family) ? 'function' : family === 'MOVE' ? 'motion' : ['IF', 'ELSE', 'EACH', 'REPEAT', 'JUMP', 'POSITION'].includes(family) ? 'flow' : ['HELP', 'ERROR'].includes(family) ? 'help' : 'action';
}

function operandOption(value: string) {
  const label = blockFields(value).value;
  return { value, label, icon: <OperandIcon value={label}/> };
}

function Operands({ command, options, disabled, label, onChange }: { command: string; options: string[]; disabled: boolean; label: string; onChange: (value: string) => void }) {
  const fields = blockFields(command);
  if (['MOVE', 'TAKE', 'DEPOSIT'].includes(fields.family)) {
    const [, rawDirection, count = '1'] = command.split(' ');
    const query = options.includes('LISTEN');
    const defaultDirection = fields.family === 'TAKE' ? (options.includes('SERVE') ? 'DOWN' : 'UP') : (query || !options.includes('BREW') ? 'RIGHT' : 'UP');
    const direction = normalizeDirection(rawDirection ?? defaultDirection) ?? defaultDirection;
    const nextCommand = (value: string, nextCount = count) => fields.family === 'MOVE' ? `MOVE ${value} ${nextCount}` : `${fields.family} ${value}`;
    return <><DirectionSelect label={label + ' direction'} value={direction} disabled={disabled} onChange={v => onChange(nextCommand(v))}/>
      {fields.family === 'MOVE' && <><input onKeyDown={e => e.stopPropagation()} className="tile-count" type="number" min={1} max={19} step={1} aria-label={label + ' tiles'} value={count} disabled={disabled} onChange={e => {
        const n = Number(e.target.value);
        if (Number.isInteger(n) && n >= 1 && n <= 19) onChange(nextCommand(direction, String(n)));
      }}/><span className="block-verb block-suffix">tiles</span></>}
    </>;
  }
  if (!fields.value || ['JUMP', 'POSITION'].includes(fields.family)) return null;
  const variants = blockVariants(command, options);
  if (!variants.includes(command) && command !== 'ITEM heard') variants.unshift(command);
  return <><BlockSelect label={label + (fields.family === 'IF' ? ' condition' : ' value')} value={command} disabled={disabled} onChange={onChange}
    options={variants.map(operandOption)}/>{fields.family === 'ITEM' && <span className="block-verb block-suffix">on paper</span>}</>;
}

function CommandTile({ initial, options, disabled, onInsert }: { initial: string; options: string[]; disabled: boolean; onInsert: (command: string) => void }) {
  const [command, setCommand] = useState(initial);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: 'library:' + initial, data: { command }, disabled });
  const fields = blockFields(command);
  return <div ref={setNodeRef} className={'command-tile ' + category(command)} style={{ opacity: isDragging ? .4 : 1 }}>
    <button type="button" disabled={disabled} aria-label={'Insert ' + command} onClick={() => onInsert(command)} {...attributes} {...listeners}><BlockIcon command={command}/>{fields.verb}</button>
    <Operands command={command} options={options} disabled={disabled} label={'Library ' + fields.verb} onChange={setCommand}/>
  </div>;
}

const DragPreview = createContext<{ blocks: VisualBlock[]; options: string[] }>({ blocks: [], options: [] });

/** The landing preview uses the same rows and nested spacing as the committed program. */
function ProjectedBlocks({ blocks }: { blocks: VisualBlock[] }) {
  const { options } = useContext(DragPreview);
  return blocks.map(block => <div key={block.line} className={block.children ? 'code-scope ' + category(block.command) : 'code-statement'}>
    <div className="code-row"><div className={'block ' + category(block.command) + (block.command.startsWith('POSITION ') ? ' jump-target' : '')}
      data-jump={block.command.startsWith('JUMP ') ? block.command.slice(5) : undefined} data-target={block.command.startsWith('POSITION ') ? block.command.slice(9) : undefined} data-line={block.line}>
      {!block.command.startsWith('POSITION ') && <><BlockIcon command={block.command}/><strong className="block-verb">{blockFields(block.command).verb}</strong><Operands command={block.command} options={options} disabled label="Preview" onChange={() => {}}/></>}
    </div></div>
    {block.children && <div className="scope-body">{block.children.length ? <ProjectedBlocks blocks={block.children}/> : <div className="empty-scope">Drop a block here</div>}</div>}
    {!!block.alternative?.length && <><div className="code-row"><div className="block flow"><BlockIcon command="ELSE"/><strong className="block-verb">Else</strong></div></div><div className="scope-body"><ProjectedBlocks blocks={block.alternative}/></div></>}
  </div>);
}

function Insertion({ at, disabled, alternative = false, hint = '' }: { at: number; disabled: boolean; alternative?: boolean; hint?: string }) {
  const { setNodeRef, isOver } = useDroppable({ id: (alternative ? 'else:' : 'gap:') + at, data: { at, alternative }, disabled });
  const { blocks } = useContext(DragPreview);
  const isElse = hint === 'Else';
  const preview = isOver && !!blocks.length;
  return <div className={'insertion-anchor ' + (hint ? 'with-hint ' : '') + (isElse ? 'else-preview' : '')}>
    <div ref={setNodeRef} data-drop-slot={(alternative ? 'else:' : 'gap:') + at} aria-label={isElse ? 'Else branch drop target' : hint || undefined} className={'code-insertion ' + (hint ? 'with-hint ' : '') + (isElse ? 'else-option ' : '') + (isOver ? 'drop-target' : '')}>
      {isElse ? <><div className="code-row"><div className="block flow"><BlockIcon command="ELSE"/><strong className="block-verb">Else</strong></div></div><div className="scope-body">
        {preview ? <div className="drop-projection"><ProjectedBlocks blocks={blocks[0]?.command === 'ELSE' ? blocks[0].children ?? [] : blocks}/></div> : <div className="empty-scope">Drop a block here</div>}
      </div></> : !preview && hint}
    </div>
    {!isElse && preview && <div className="drop-projection"><ProjectedBlocks blocks={blocks}/></div>}
  </div>;
}

/** Hide the original group only while a landing slot displays its full-size preview. */
function ProgramSurface({ root, children }: { root: React.RefObject<HTMLDivElement | null>; children: React.ReactNode }) {
  const { active, over } = useDndContext();
  return <div className={'block-list visual-program' + (active ? ' is-dragging' : '') + (over ? ' has-drop-preview' : '')} ref={root}>{children}</div>;
}

function Row({ block, depth, ordinal, locked, active, failure, failureMessage, onEdit, options, onReplace }: {
  block: VisualBlock; depth: number; ordinal: number; locked: boolean; active: boolean; failure: boolean; options: string[];
  onReplace: (c: string) => void;
  failureMessage?: string; onEdit?: () => void;
}) {
  const { line: id, command } = block;
  const { attributes, listeners, setNodeRef } = useDraggable({ id: String(id), data: { at: id }, disabled: locked });
  const rowRef = useRef<HTMLDivElement | null>(null), target = command.startsWith('POSITION ');
  useEffect(() => {
    if (active || failure) (failure ? rowRef.current?.parentElement : rowRef.current)?.scrollIntoView?.({ block: 'nearest', behavior: 'instant' });
  }, [active, failure]);
  return <div className="code-row">
    <span className="line-number" style={{ left: -(depth * 42 + 35) }} aria-hidden="true">{String(ordinal).padStart(2, '0')}</span>
    <div ref={node => { setNodeRef(node); rowRef.current = node; }} {...attributes} {...listeners} aria-label={target ? 'Drag jump destination' : 'Drag block ' + ordinal + ' and its group'} aria-disabled={locked} tabIndex={locked ? -1 : 0} className={['block', category(command), target ? 'jump-target' : '', active ? 'active' : '', failure ? 'failure' : ''].join(' ')}
      aria-current={active && !failure ? 'step' : undefined} data-line={id} data-depth={depth} data-jump={command.startsWith('JUMP ') ? command.slice(5) : undefined} data-target={target ? command.slice(9) : undefined}>

      {!target && <><BlockIcon command={command}/><strong className="block-verb">{blockFields(command).verb}</strong><Operands command={command} options={options} disabled={locked} label={'Block ' + (id + 1)} onChange={onReplace}/></>}
      {target && <span className="sr-only">Jump destination</span>}
      {active && !failure && <span className="instruction-state is-running" role="img" aria-label="Running" title="Running"><i aria-hidden="true"/></span>}
      {failure && <span className="instruction-state is-error" role="img" aria-label="Error" title="Error"><i aria-hidden="true"/>Error</span>}
    </div>
    {failure && failureMessage && <InstructionError message={failureMessage} onEdit={locked ? onEdit : undefined}/>}
  </div>;
}

interface JumpConnection { d: string }

/** Jump connectors share the code's scroll surface and track their movable empty targets. */
function JumpArrows({ root, source, dragging }: { root: React.RefObject<HTMLDivElement | null>; source: string; dragging: boolean }) {
  const [links, setLinks] = useState<JumpConnection[]>([]), marker = 'jump-' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  useEffect(() => {
    // Parent host refs are attached before passive effects, including on a saved-program reload.
    const element = root.current;
    if (!element) return;
    const measure = () => {
      const bounds = element.getBoundingClientRect();
      const next = [...element.querySelectorAll<HTMLElement>('[data-jump]')].filter(node => !node.closest('.has-drop-preview .drag-source')).flatMap((jump, index) => {
        const target = [...element.querySelectorAll<HTMLElement>('[data-target]')].find(t => t.dataset.target === jump.dataset.jump && !t.closest('.has-drop-preview .drag-source'));
        if (!target) return [];
        const jumpLine = Number(jump.getAttribute('data-line')), targetLine = Number(target.getAttribute('data-line'));
        if (!Number.isInteger(jumpLine) || !Number.isInteger(targetLine)) return [];
        const a = jump.getBoundingClientRect(), b = target.getBoundingClientRect();
        const x1 = a.right - bounds.left + 3, y1 = a.top - bounds.top + a.height / 2;
        const x2 = b.right - bounds.left + 5, y2 = b.top - bounds.top + b.height / 2;
        // Route beyond every intervening tile, including wider operands and nested scopes.
        const clearance = [...element.querySelectorAll<HTMLElement>('.code-row .block')].reduce((right, block) => {
          if (block.closest('.has-drop-preview .drag-source')) return right;
          const rect = block.getBoundingClientRect(), middle = rect.top - bounds.top + rect.height / 2;
          return middle >= Math.min(y1, y2) && middle <= Math.max(y1, y2) ? Math.max(right, rect.right - bounds.left) : right;
        }, Math.max(x1, x2));
        const bend = clearance + 24 + Math.min(110, Math.abs(y2 - y1) * .22) + index * 8;
        const r = Math.min(18, Math.abs(y2 - y1) / 2);
        const s = y2 >= y1 ? 1 : -1;
        const d = r < 1 ? 'M ' + x1 + ' ' + y1 + ' H ' + x2
          : 'M ' + x1 + ' ' + y1 + ' H ' + (bend - r) + ' Q ' + bend + ' ' + y1 + ' ' + bend + ' ' + (y1 + s * r) + ' V ' + (y2 - s * r) + ' Q ' + bend + ' ' + y2 + ' ' + (bend - r) + ' ' + y2 + ' H ' + x2;
        return [{ d }];
      });
      setLinks(current => JSON.stringify(current) === JSON.stringify(next) ? current : next);
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure);
    observer?.observe(element);
    element.querySelectorAll('.code-row .block').forEach(block => observer?.observe(block));
    window.addEventListener('resize', measure);
    let frame = 0;
    const track = () => { measure(); frame = requestAnimationFrame(track); };
    if (dragging) frame = requestAnimationFrame(track);
    return () => { cancelAnimationFrame(frame); observer?.disconnect(); window.removeEventListener('resize', measure); };
  }, [root, source, dragging]);
  return <svg className="jump-arrows" aria-label="Jump connections"><defs><marker id={marker} viewBox="0 0 12 12" refX="9" refY="6" markerWidth="6" markerHeight="6" orient="auto"><path d="M3 2 L9 6 L3 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></marker></defs>{links.map((l, i) => <path key={i} d={l.d} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" markerEnd={'url(#' + marker + ')'}/>)}</svg>;
}

export function Editor({ role = 'query', source, onChange, level, locked, observation, activeLine = -1, failureLine = -1, failureMessage, onEdit, textMode }: {
  role?: RobotRole; source: string; onChange: (v: string) => void; level: number; locked: boolean; observation: boolean;
  activeLine?: number; failureLine?: number; textMode: boolean;
  failureMessage?: string; onEdit?: () => void;
}) {
  const [dragged, setDragged] = useState('');
  const root = useRef<HTMLDivElement>(null), codeArea = useRef<HTMLDivElement>(null), pointer = useRef<{ x: number; y: number } | null>(null);
  const dragScope = useRef<DraggedScope | undefined>(undefined), lastSlot = useRef<string | undefined>(undefined);
  const [draggedLine, setDraggedLine] = useState<number | null>(null);
  const options = robotCommands(role, level), disabled = locked || observation;
  const keyboardCoordinates: KeyboardCoordinateGetter = (event, { context, currentCoordinates }) => {
    const rect = context.collisionRect;
    if (!rect || !['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code)) return;
    event.preventDefault();
    const point = { x: rect.left, y: rect.top + rect.height / 2 };
    const slots = context.droppableContainers.getEnabled().flatMap(container => {
      const target = context.droppableRects.get(container.id), data = container.data.current;
      return target && typeof data?.at === 'number' ? [{ id: String(container.id), at: data.at, alternative: !!data.alternative, left: target.left, top: target.top, height: target.height }] : [];
    });
    const slot = keyboardDropSlot(event.code, point, slots, dragScope.current);
    if (!slot) return;
    lastSlot.current = slot.id;
    return { x: currentCoordinates.x + slot.left - point.x, y: currentCoordinates.y + slot.top + slot.height / 2 - point.y };
  };
  const sensors = useSensors(useSensor(BlockPointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: keyboardCoordinates }));
  const change = (value: string) => { if (!disabled) onChange(value); };
  const insert = (command: string) => change(placeBlock(source, command, source ? source.split('\n').length : 0));
  const tree = visualProgram(source);
  const elseBlock = (block: VisualBlock): VisualBlock => ({ line: block.elseLine!, command: 'ELSE', end: block.end - 1 });
  const flatten = (blocks: VisualBlock[]): VisualBlock[] => blocks.flatMap(b => [b, ...flatten(b.children ?? []), ...(b.alternative?.length ? [elseBlock(b), ...flatten(b.alternative)] : [])]);
  const rows = flatten(tree);
  const visibleFailureLine = failureLine < 0 ? -1 : (rows.find(r => r.line === failureLine) ?? rows.findLast(r => r.line <= failureLine) ?? rows[0])?.line ?? -1;
  const renderBlocks = (blocks: VisualBlock[], depth = 0): React.ReactNode => blocks.map(block => <div className={(block.children ? 'code-scope ' + category(block.command) : 'code-statement') + (draggedLine === block.line ? ' drag-source' : '')} key={block.line}>
    <Row block={block} depth={depth} ordinal={rows.findIndex(r => r.line === block.line) + 1} options={options} locked={disabled} active={activeLine === block.line} failure={visibleFailureLine === block.line} failureMessage={failureMessage} onEdit={onEdit}
      onReplace={c => { const lines = source.split('\n'); lines[block.line] = c; change(lines.join('\n')); }}/>
    {block.children && <div className="scope-body">
      <Insertion at={block.line + 1} disabled={disabled} hint={block.children.length ? '' : 'Drop a block here'}/>
      {renderBlocks(block.children, depth + 1)}
    </div>}
    {!!block.alternative?.length && <div className={'else-body' + (draggedLine === block.elseLine ? ' drag-source' : '')}>
      <Row block={elseBlock(block)} depth={depth} ordinal={rows.findIndex(r => r.line === block.elseLine) + 1} options={options} locked={disabled} active={activeLine === block.elseLine} failure={visibleFailureLine === block.elseLine} failureMessage={failureMessage} onEdit={onEdit}
        onReplace={() => {}}/>
      <div className="scope-body"><Insertion at={block.elseLine! + 1} disabled={disabled}/>{renderBlocks(block.alternative, depth + 1)}</div>
    </div>}
    {block.command.startsWith('IF ') && !block.alternative?.length && dragged && <Insertion at={block.end} alternative={block.elseLine === undefined} disabled={disabled} hint="Else"/>}
    <Insertion at={block.end + 1} disabled={disabled}/>
  </div>);

  const previewBlock = rows.find(block => block.line === draggedLine);
  const previewBlocks = draggedLine === null ? visualProgram(dragged) : previewBlock ? [previewBlock.command === 'ELSE'
    ? { ...previewBlock, children: rows.find(block => block.elseLine === draggedLine)?.alternative }
    : previewBlock] : [];

  const resetDrag = () => { setDragged(''); setDraggedLine(null); dragScope.current = undefined; lastSlot.current = undefined; };
  return <DndContext sensors={sensors} measuring={{ droppable: { strategy: MeasuringStrategy.Always } }} collisionDetection={args => {
      pointer.current = args.pointerCoordinates;
      const point = args.pointerCoordinates ?? { x: args.collisionRect.left, y: args.collisionRect.top + args.collisionRect.height / 2 };
      const bounds = codeArea.current?.getBoundingClientRect();
      if (!bounds || point.x < bounds.left || point.x > bounds.right || point.y < bounds.top || point.y > bounds.bottom) { lastSlot.current = undefined; return []; }
      const landing = root.current?.querySelector('.drop-projection')?.getBoundingClientRect();
      if (landing && lastSlot.current && point.x >= landing.left - 20 && point.x <= landing.right + 40 && point.y >= landing.top - 10 && point.y <= landing.bottom + 10) return [{ id: lastSlot.current }];
      const slots = args.droppableContainers.flatMap(container => {
        const rect = args.droppableRects.get(container.id), data = container.data.current;
        return rect && typeof data?.at === 'number' ? [{ id: String(container.id), at: data.at, alternative: !!data.alternative, left: rect.left, top: rect.top, height: rect.height }] : [];
      });
      const slot = pickDropSlot(point, slots, dragScope.current, lastSlot.current);
      lastSlot.current = slot?.id;
      return slot ? [{ id: slot.id }] : [];
    }}
    onDragStart={({ active }) => {
      pointer.current = null;
      const dataAt = active.data.current?.at, line = typeof dataAt === 'number' ? dataAt : Number(active.id);
      const row = rows.find(r => r.line === line);
      setDragged(active.data.current?.command ?? row?.command ?? '');
      setDraggedLine(row?.line ?? (Number.isInteger(line) ? line : null));
      dragScope.current = row ? { from: row.line, end: row.end, command: row.command } : undefined;
      lastSlot.current = undefined;
    }}
    onDragCancel={resetDrag}
    onDragEnd={({ active, over }) => {
      resetDrag(); if (disabled) return;
      const library = String(active.id).startsWith('library:');
      const dataAt = active.data.current?.at, line = typeof dataAt === 'number' ? dataAt : Number(active.id);
      const bounds = codeArea.current?.getBoundingClientRect(), point = pointer.current;
      if (!library && bounds && point && (point.x < bounds.left || point.x > bounds.right || point.y < bounds.top || point.y > bounds.bottom)) {
        if (Number.isInteger(line)) change(removeVisualBlock(source, line)); return;
      }
      if (!over) return;
      const at = over.data.current?.at; if (typeof at !== 'number') return;
      const command = library ? String(active.data.current?.command ?? '') : rows.find(r => r.line === line)?.command;
      if (command) change(placeBlock(source, command, at, library ? undefined : line, !!over.data.current?.alternative));
    }}>
    <DragPreview.Provider value={{ blocks: previewBlocks, options }}>
    <section className="palette compact-palette" aria-label="Available code blocks"><div className="command-library">{blockPrototypes(options).map(c => <CommandTile key={role + ':' + level + ':' + c} initial={c} options={options} disabled={disabled} onInsert={insert}/>)}</div></section>
    <div className="editor-body" aria-label="Code zone" ref={codeArea}>
      {failureMessage && (textMode || !rows.length) && <InstructionError message={failureMessage} onEdit={locked ? onEdit : undefined}/>}
      {observation ? null : textMode ? <textarea spellCheck={false} aria-label="Program source" value={source} onChange={e => change(e.target.value)} readOnly={locked} className={'code-input ' + (failureLine >= 0 ? 'code-error' : '')}/> :
        <ProgramSurface root={root}>
          <Insertion at={0} disabled={disabled} hint={rows.length ? '' : 'Drop your first block'}/>
          {renderBlocks(tree)}<JumpArrows root={root} source={source} dragging={!!dragged}/>
        </ProgramSurface>}
    </div>
    <DragOverlay dropAnimation={null}>{dragged && <div className="drag-preview floating-code-preview"><ProjectedBlocks blocks={previewBlocks}/></div>}</DragOverlay>
    </DragPreview.Provider>
  </DndContext>;
}
