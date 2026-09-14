import { useRef, useState, useEffect, useLayoutEffect, useId } from 'react';
import { DndContext, DragOverlay, KeyboardSensor, MeasuringStrategy, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import type { KeyboardCoordinateGetter } from '@dnd-kit/core';
import { GripVertical } from 'lucide-react';
import type { RobotRole } from '../domain/types';
import { robotCommands } from '../domain/robotProgram';
import { blockFields, blockPrototypes, blockVariants } from '../domain/blockFields';
import { placeBlock, removeVisualBlock, visualProgram } from '../domain/visualProgram';
import type { VisualBlock } from '../domain/visualProgram';
import { BlockSelect } from './BlockSelect';
import { BlockIcon } from './BlockIcon';
import { InstructionError } from './FailureFeedback';
import { keyboardDropSlot, pickDropSlot } from '../domain/dragPlacement';
import type { DraggedScope } from '../domain/dragPlacement';

function category(command: string) {
  const family = blockFields(command).family;
  return ['FUNCTION', 'CALL', 'RETURN'].includes(family) ? 'function' : family === 'MOVE' ? 'motion' : ['IF', 'ELSE', 'EACH', 'REPEAT', 'JUMP', 'POSITION'].includes(family) ? 'flow' : ['HELP', 'ERROR'].includes(family) ? 'help' : 'action';
}

function Operands({ command, options, disabled, label, onChange }: { command: string; options: string[]; disabled: boolean; label: string; onChange: (value: string) => void }) {
  const fields = blockFields(command);
  if (fields.family === 'MOVE') {
    const [, direction, count] = command.split(' ');
    const query = options.includes('LISTEN');
    const directions = [...new Set(blockVariants(command, options).map(c => c.split(' ')[1]))];
    return <>
      <BlockSelect label={label + ' direction'} value={direction} disabled={disabled} onChange={v => onChange('MOVE ' + v + ' ' + count)} options={directions.map(value => ({ value, label: value.toLowerCase() }))}/>
      <input className="tile-count" type="number" min={1} max={query ? 1 : 19} step={1} aria-label={label + ' tiles'} value={count} disabled={disabled || query} onChange={e => {
        const n = Number(e.target.value);
        if (Number.isInteger(n) && n >= 1 && n <= 19) onChange('MOVE ' + direction + ' ' + n);
      }}/><span className="block-verb block-suffix">tiles</span>
    </>;
  }
  if (!fields.value || ['JUMP', 'POSITION'].includes(fields.family)) return null;
  const variants = blockVariants(command, options);
  if (!variants.includes(command) && command !== 'ITEM heard') variants.unshift(command);
  return <><BlockSelect label={label + (fields.family === 'IF' ? ' condition' : ' value')} value={command} disabled={disabled} onChange={onChange}
    options={variants.map(value => ({ value, label: blockFields(value).value }))}/>{fields.family === 'ITEM' && <span className="block-verb block-suffix">to ticket</span>}</>;
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

function Insertion({ at, disabled, alternative = false, hint = '' }: { at: number; disabled: boolean; alternative?: boolean; hint?: string }) {
  const { setNodeRef, isOver } = useDroppable({ id: (alternative ? 'else:' : 'gap:') + at, data: { at, alternative }, disabled });
  return <div className={'insertion-anchor ' + (hint ? 'with-hint ' : '') + (hint === 'Else' ? 'else-preview' : '')}>
    <div ref={setNodeRef} aria-label={hint === 'Else' ? 'Else branch drop target' : hint || undefined} className={'code-insertion ' + (hint ? 'with-hint ' : '') + (hint === 'Else' ? 'else-option block flow ' : '') + (isOver ? 'drop-target' : '')}>
      {hint === 'Else' ? <><BlockIcon command="ELSE"/><strong className="block-verb">Else</strong></> : hint}
    </div>
  </div>;
}

function Row({ block, depth, ordinal, selected, locked, active, failure, failureMessage, onEdit, options, onSelect, onReplace }: {
  block: VisualBlock; depth: number; ordinal: number; selected: boolean; locked: boolean; active: boolean; failure: boolean; options: string[];
  onSelect: () => void; onReplace: (c: string) => void;
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
    <div ref={node => { setNodeRef(node); rowRef.current = node; }} {...(target ? attributes : {})} {...(target ? listeners : {})} className={['block', category(command), target ? 'jump-target' : '', selected ? 'selected' : '', active ? 'active' : '', failure ? 'failure' : ''].join(' ')}
      onClick={onSelect} onFocus={onSelect} aria-current={active && !failure ? 'step' : undefined} data-line={id} data-depth={depth} data-jump={command.startsWith('JUMP ') ? command.slice(5) : undefined} data-target={target ? command.slice(9) : undefined}>
      <button className="grip" aria-label={target ? 'Drag jump destination' : 'Drag block ' + ordinal + ' and its group'} disabled={locked} {...attributes} {...listeners}><GripVertical size={13}/></button>
      {!target && <><BlockIcon command={command}/><strong className="block-verb">{blockFields(command).verb}</strong><Operands command={command} options={options} disabled={locked} label={'Block ' + (id + 1)} onChange={onReplace}/></>}
      {target && <span className="sr-only">Jump destination</span>}
      {(active || failure) && <span className={'instruction-state ' + (failure ? 'is-error' : 'is-running')}><i aria-hidden="true"/>{failure ? 'Error' : 'Running'}</span>}
    </div>
    {failure && failureMessage && <InstructionError message={failureMessage} onEdit={locked ? onEdit : undefined}/>}
  </div>;
}

/** Small grab points at each end of a jump connector move the same block its grip moves. */
function JumpHandle({ id, line, x, y, label, disabled }: {
  id: string; line: number; x: number; y: number; label: string; disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id, data: { at: line }, disabled });
  return <button type="button" ref={setNodeRef} {...attributes} {...listeners} disabled={disabled}
    className={'jump-handle' + (isDragging ? ' is-dragging' : '')} style={{ left: x, top: y }}
    aria-label={label} title={label}/>;
}

interface JumpConnection { d: string; x1: number; y1: number; x2: number; y2: number; jumpLine: number; targetLine: number }

/** Jump connectors share the code's scroll surface and track their movable empty targets. */
function JumpArrows({ root, source, rows, disabled }: { root: React.RefObject<HTMLDivElement | null>; source: string; rows: VisualBlock[]; disabled: boolean }) {
  const [links, setLinks] = useState<JumpConnection[]>([]), marker = useId().replaceAll(':', '');
  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    const measure = () => {
      const bounds = element.getBoundingClientRect();
      setLinks([...element.querySelectorAll<HTMLElement>('[data-jump]')].flatMap((jump, index) => {
        const target = [...element.querySelectorAll<HTMLElement>('[data-target]')].find(t => t.dataset.target === jump.dataset.jump);
        if (!target) return [];
        const jumpLine = Number(jump.getAttribute('data-line')), targetLine = Number(target.getAttribute('data-line'));
        if (!Number.isInteger(jumpLine) || !Number.isInteger(targetLine)) return [];
        const a = jump.getBoundingClientRect(), b = target.getBoundingClientRect();
        const x1 = a.right - bounds.left + 3, y1 = a.top - bounds.top + a.height / 2;
        const x2 = b.right - bounds.left + 5, y2 = b.top - bounds.top + b.height / 2;
        const bend = Math.max(bounds.width - 36 - index * 14, Math.max(x1, x2) + 20);
        const r = Math.min(10, Math.abs(y2 - y1) / 2);
        const s = y2 >= y1 ? 1 : -1;
        const d = r < 1 ? 'M ' + x1 + ' ' + y1 + ' H ' + x2
          : 'M ' + x1 + ' ' + y1 + ' H ' + (bend - r) + ' Q ' + bend + ' ' + y1 + ' ' + bend + ' ' + (y1 + s * r) + ' V ' + (y2 - s * r) + ' Q ' + bend + ' ' + y2 + ' ' + (bend - r) + ' ' + y2 + ' H ' + x2;
        return [{ d, x1, y1, x2, y2, jumpLine, targetLine }];
      }));
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure);
    observer?.observe(element);
    window.addEventListener('resize', measure);
    return () => { observer?.disconnect(); window.removeEventListener('resize', measure); };
  }, [root, source]);
  const ordinal = (line: number) => rows.findIndex(r => r.line === line) + 1;
  return <>
    <svg className="jump-arrows" aria-label="Jump connections"><defs><marker id={marker} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10" fill="currentColor"/></marker></defs>{links.map((l, i) => <path key={i} d={l.d} fill="none" stroke="currentColor" strokeWidth="2.5" markerEnd={'url(#' + marker + ')'}/>)}</svg>
    <div className="jump-handles">{links.flatMap((l, i) => [
      <JumpHandle key={'start:' + i} id={'jump-handle:start:' + l.jumpLine + ':' + i} line={l.jumpLine} x={l.x1} y={l.y1} disabled={disabled} label={'Drag jump arrow start for block ' + ordinal(l.jumpLine)}/>,
      <JumpHandle key={'end:' + i} id={'jump-handle:end:' + l.targetLine + ':' + i} line={l.targetLine} x={l.x2} y={l.y2} disabled={disabled} label={'Drag jump arrow end for destination ' + ordinal(l.targetLine)}/>,
    ])}</div>
  </>;
}

export function Editor({ role = 'query', source, onChange, level, locked, observation, activeLine = -1, failureLine = -1, failureMessage, onEdit, textMode }: {
  role?: RobotRole; source: string; onChange: (v: string) => void; level: number; locked: boolean; observation: boolean;
  activeLine?: number; failureLine?: number; textMode: boolean;
  failureMessage?: string; onEdit?: () => void;
}) {
  const [selection, setSelection] = useState<{ at: number; alternative?: boolean } | null>(null), [dragged, setDragged] = useState('');
  const root = useRef<HTMLDivElement>(null), codeArea = useRef<HTMLDivElement>(null), pointer = useRef<{ x: number; y: number } | null>(null);
  const dragScope = useRef<DraggedScope | undefined>(undefined), lastSlot = useRef<string | undefined>(undefined);
  const [draggedLine, setDraggedLine] = useState<number | null>(null);
  const options = robotCommands(role, level), disabled = locked || observation;
  useEffect(() => { setSelection(null); }, [role]);
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
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: keyboardCoordinates }));
  const change = (value: string) => { if (!disabled) onChange(value); };
  const insert = (command: string) => {
    change(placeBlock(source, command, selection?.at ?? (source ? source.split('\n').length : 0), undefined, selection?.alternative));
    setSelection(null);
  };
  const tree = visualProgram(source);
  const elseBlock = (block: VisualBlock): VisualBlock => ({ line: block.elseLine!, command: 'ELSE', end: block.end - 1 });
  const flatten = (blocks: VisualBlock[]): VisualBlock[] => blocks.flatMap(b => [b, ...flatten(b.children ?? []), ...(b.alternative?.length ? [elseBlock(b), ...flatten(b.alternative)] : [])]);
  const rows = flatten(tree);
  const visibleFailureLine = failureLine < 0 ? -1 : (rows.find(r => r.line === failureLine) ?? rows.findLast(r => r.line <= failureLine) ?? rows[0])?.line ?? -1;
  const renderBlocks = (blocks: VisualBlock[], depth = 0): React.ReactNode => blocks.map(block => <div className={(block.children ? 'code-scope ' + category(block.command) : 'code-statement') + (draggedLine === block.line ? ' drag-source' : '')} key={block.line}>
    <Row block={block} depth={depth} ordinal={rows.findIndex(r => r.line === block.line) + 1} options={options} locked={disabled} selected={selection?.at === block.line + 1} active={activeLine === block.line} failure={visibleFailureLine === block.line} failureMessage={failureMessage} onEdit={onEdit}
      onSelect={() => setSelection({ at: block.line + 1 })} onReplace={c => { const lines = source.split('\n'); lines[block.line] = c; change(lines.join('\n')); }}/>
    {block.children && <div className="scope-body">
      <Insertion at={block.line + 1} disabled={disabled} hint={block.children.length ? '' : 'Drop a block here'}/>
      {renderBlocks(block.children, depth + 1)}
    </div>}
    {!!block.alternative?.length && <div className={'else-body' + (draggedLine === block.elseLine ? ' drag-source' : '')}>
      <Row block={elseBlock(block)} depth={depth} ordinal={rows.findIndex(r => r.line === block.elseLine) + 1} options={options} locked={disabled} selected={selection?.at === block.elseLine! + 1} active={activeLine === block.elseLine} failure={visibleFailureLine === block.elseLine} failureMessage={failureMessage} onEdit={onEdit}
        onSelect={() => setSelection({ at: block.elseLine! + 1 })} onReplace={() => {}}/>
      <div className="scope-body"><Insertion at={block.elseLine! + 1} disabled={disabled}/>{renderBlocks(block.alternative, depth + 1)}</div>
    </div>}
    {block.command.startsWith('IF ') && !block.alternative?.length && dragged && <Insertion at={block.end} alternative={block.elseLine === undefined} disabled={disabled} hint="Else"/>}
    <Insertion at={block.end + 1} disabled={disabled}/>
  </div>);

  const resetDrag = () => { setDragged(''); setDraggedLine(null); dragScope.current = undefined; lastSlot.current = undefined; };
  return <DndContext sensors={sensors} measuring={{ droppable: { strategy: MeasuringStrategy.Always } }} collisionDetection={args => {
      pointer.current = args.pointerCoordinates;
      const point = args.pointerCoordinates ?? { x: args.collisionRect.left, y: args.collisionRect.top + args.collisionRect.height / 2 };
      const bounds = codeArea.current?.getBoundingClientRect();
      if (!bounds || point.x < bounds.left || point.x > bounds.right || point.y < bounds.top || point.y > bounds.bottom) { lastSlot.current = undefined; return []; }
      const slots = args.droppableContainers.flatMap(container => {
        const rect = args.droppableRects.get(container.id), data = container.data.current;
        return rect && typeof data?.at === 'number' ? [{ id: String(container.id), at: data.at, alternative: !!data.alternative, left: rect.left, top: rect.top, height: rect.height }] : [];
      });
      const slot = pickDropSlot(point, slots, dragScope.current, lastSlot.current);
      lastSlot.current = slot?.id;
      return slot ? [{ id: slot.id }] : [];
    }}
    onDragStart={({ active }) => {
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
        if (Number.isInteger(line)) change(removeVisualBlock(source, line)); setSelection(null); return;
      }
      if (!over) return;
      const at = over.data.current?.at; if (typeof at !== 'number') return;
      const command = library ? String(active.data.current?.command ?? '') : rows.find(r => r.line === line)?.command;
      if (command) change(placeBlock(source, command, at, library ? undefined : line, !!over.data.current?.alternative));
      setSelection(null);
    }}>
    <section className="palette compact-palette" aria-label="Available code blocks"><div className="command-library">{blockPrototypes(options).map(c => <CommandTile key={role + ':' + level + ':' + c} initial={c} options={options} disabled={disabled} onInsert={insert}/>)}</div></section>
    <div className="editor-body" aria-label="Code zone" ref={codeArea}>
      {failureMessage && (textMode || !rows.length) && <InstructionError message={failureMessage} onEdit={locked ? onEdit : undefined}/>}
      {observation ? null : textMode ? <textarea spellCheck={false} aria-label="Program source" value={source} onChange={e => change(e.target.value)} readOnly={locked} className={'code-input ' + (failureLine >= 0 ? 'code-error' : '')}/> :
        <div className={'block-list visual-program ' + (dragged ? 'is-dragging' : '')} ref={root}>
          <Insertion at={0} disabled={disabled} hint={rows.length ? '' : 'Drop your first block'}/>
          {renderBlocks(tree)}<JumpArrows root={root} source={source} rows={rows} disabled={disabled}/>
        </div>}
    </div>
    <DragOverlay dropAnimation={null}>{dragged && <div className={'command-ghost drag-preview ' + category(dragged)}><BlockIcon command={dragged}/>{blockFields(dragged).verb} {blockFields(dragged).value}</div>}</DragOverlay>
  </DndContext>;
}
