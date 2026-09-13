import { useRef, useState, useEffect } from 'react';
import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowUp, ArrowDown, X, GripVertical, Plus } from 'lucide-react';
import type { RobotRole } from '../domain/types';
import { robotCommands } from '../domain/robotProgram';
import { blockFields, blockPrototypes, blockVariants } from '../domain/blockFields';
import { isOpening } from '../domain/program';
import { deleteBlock, insertBlock, moveBlock, moveGroup } from '../domain/editor';

function category(command: string) {
  const family = blockFields(command).family;
  return ['FUNCTION', 'CALL', 'RETURN'].includes(family) ? 'function' : family === 'MOVE' ? 'motion' : ['IF', 'END', 'ELSE', 'EACH', 'REPEAT', 'JUMP', 'POSITION'].includes(family) ? 'flow' : ['HELP', 'ERROR'].includes(family) ? 'help' : 'action';
}

/** Operands change within an action, never replace its structural type. */
function Operands({ command, options, disabled, label, onChange }: { command: string; options: string[]; disabled: boolean; label: string; onChange: (value: string) => void }) {
  const fields = blockFields(command);
  if (fields.family === 'MOVE') {
    const [, direction, count] = command.split(' ');
    return <>
      <select aria-label={label + ' direction'} value={direction} disabled={disabled} onChange={e => onChange('MOVE ' + e.target.value + ' ' + count)}>
        {['UP', 'DOWN', 'LEFT', 'RIGHT'].map(d => <option key={d} value={d}>{d.toLowerCase()}</option>)}
      </select>
      <input className="tile-count" type="number" min={1} max={19} step={1} aria-label={label + ' tiles'} value={count} disabled={disabled} onChange={e => {
        const n = Number(e.target.value);
        if (Number.isInteger(n) && n >= 1 && n <= 19) onChange('MOVE ' + direction + ' ' + n);
      }}/>
      <span>tiles</span>
    </>;
  }
  if (!fields.value) return null;
  const variants = blockVariants(command, options);
  return <select aria-label={label + (fields.family === 'IF' ? ' condition' : ' value')} value={command} disabled={disabled} onChange={e => onChange(e.target.value)}>
    {!variants.includes(command) && <option value={command}>{fields.value}</option>}
    {variants.map(c => <option value={c} key={c}>{blockFields(c).value}</option>)}
  </select>;
}

/** A library action is configured in place, then clicked or dragged into the code. */
function CommandTile({ initial, options, disabled, onInsert }: { initial: string; options: string[]; disabled: boolean; onInsert: (command: string) => void }) {
  const [command, setCommand] = useState(initial);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: 'library:' + initial, data: { command }, disabled });
  const fields = blockFields(command);
  return <div ref={setNodeRef} className={'command-tile ' + category(command)} style={{ opacity: isDragging ? .4 : 1 }}>
    <button type="button" disabled={disabled} aria-label={'Insert ' + command} onClick={() => onInsert(command)} {...attributes} {...listeners}><Plus size={12}/>{fields.verb}</button>
    <Operands command={command} options={options} disabled={disabled} label={'Library ' + fields.verb} onChange={setCommand}/>
  </div>;
}

function ProgramEnd({ disabled, onSelect }: { disabled: boolean; onSelect: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'program-end', disabled });
  return <button ref={setNodeRef} className={'insert-hint ' + (isOver ? 'drop-target' : '')} disabled={disabled} onClick={onSelect}><Plus size={14}/> Add at the end</button>;
}

function Row({ id, command, depth, selected, locked, active, failure, options, onSelect, onReplace, onMove, onDelete }: {
  id: number; command: string; depth: number; selected: boolean; locked: boolean; active: boolean; failure: boolean; options: string[];
  onSelect: () => void; onReplace: (c: string) => void; onMove: (d: number) => void; onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({ id: String(id), disabled: locked });
  const rowRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => { if (active) rowRef.current?.scrollIntoView({ block: 'nearest', behavior: 'instant' }); }, [active]);
  return <div ref={node => { setNodeRef(node); rowRef.current = node; }} className={['block', category(command), isOpening(command) ? 'scope-open' : '', command === 'END' ? 'scope-end' : '', selected ? 'selected' : '', active ? 'active' : '', failure ? 'failure' : '', isOver && !isDragging ? 'drop-target' : ''].join(' ')}
    style={{ marginLeft: depth * 24, transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? .4 : 1 }}
    onClick={onSelect} onFocus={onSelect} data-line={id} data-depth={depth}>
    {depth > 0 && <span className="indent-guides" aria-hidden="true">{Array.from({ length: depth }, (_, i) => <i key={i} style={{ left: -(i + 1) * 24 + 10 }}/>)}</span>}
    <button className="grip" aria-label={'Drag block ' + (id + 1) + ' and its group'} disabled={locked} {...attributes} {...listeners}><GripVertical size={13}/><span>{String(id + 1).padStart(2, '0')}</span></button>
    <strong className="block-verb">{blockFields(command).verb}</strong>
    <Operands command={command} options={options} disabled={locked} label={'Block ' + (id + 1)} onChange={onReplace}/>
    <div className="block-actions" onClick={e => e.stopPropagation()}>
      <button aria-label={'Move block ' + (id + 1) + ' up'} disabled={locked || id === 0} onClick={() => onMove(-1)}><ArrowUp size={12}/></button>
      <button aria-label={'Move block ' + (id + 1) + ' down'} disabled={locked} onClick={() => onMove(1)}><ArrowDown size={12}/></button>
      <button aria-label={'Delete block ' + (id + 1)} disabled={locked} onClick={onDelete}><X size={13}/></button>
    </div>
  </div>;
}

export function Editor({ role = 'query', source, onChange, level, locked, observation, activeLine = -1, failureLine = -1, textMode }: {
  role?: RobotRole; source: string; onChange: (v: string) => void; level: number; locked: boolean; observation: boolean;
  activeLine?: number; failureLine?: number; textMode: boolean;
}) {
  const [selected, setSelected] = useState(-1), [dragged, setDragged] = useState('');
  const options = robotCommands(role, level), disabled = locked || observation;
  useEffect(() => { setSelected(-1); }, [role]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const change = (value: string) => { if (!disabled) onChange(value); };
  const insert = (instruction: string, after = selected) => {
    if (disabled) return;
    const next = insertBlock(source, instruction, after);
    setSelected(next.selected);
    change(next.source);
  };
  let depth = 0;
  const rows = source.split('\n').map((raw, id) => {
    const c = raw.trim();
    if (c === 'END' || c === 'ELSE') depth = Math.max(0, depth - 1);
    const d = depth;
    if (isOpening(c) || c === 'ELSE') depth++;
    return { id, c, depth: d };
  }).filter(row => row.c && !row.c.startsWith('#'));

  return <DndContext sensors={sensors} collisionDetection={closestCenter}
    onDragStart={({ active }) => setDragged(active.data.current?.command ?? rows.find(r => String(r.id) === active.id)?.c ?? '')}
    onDragCancel={() => setDragged('')}
    onDragEnd={({ active, over }) => {
      setDragged('');
      if (!over || disabled) return;
      const destination = over.id === 'program-end' ? source.split('\n').length : Number(over.id);
      if (String(active.id).startsWith('library:')) {
        const instruction = String(active.data.current?.command ?? '');
        if (!instruction) return;
        if (destination === 0) {
          const next = insertBlock('', instruction);
          change(next.source + (source ? '\n' + source : ''));
          setSelected(0);
        } else insert(instruction, over.id === 'program-end' ? -1 : destination - 1);
      } else { change(moveGroup(source, Number(active.id), destination)); setSelected(-1); }
    }}>
    <section className="palette compact-palette" aria-label="Available code blocks">
      <div className="command-library">{blockPrototypes(options).map(c => <CommandTile key={role + ':' + level + ':' + c} initial={c} options={options} disabled={disabled} onInsert={insert}/>)}</div>
    </section>
    <div className="editor-body" aria-label="Code zone">
      {observation ? <div className="auto-service"><strong>Niko’s routine</strong><p>Take order → Prepare → Serve → Clean</p></div> :
        textMode ? <textarea spellCheck={false} aria-label="Program source" value={source} onChange={e => change(e.target.value)} readOnly={locked} className={'code-input ' + (failureLine >= 0 ? 'code-error' : '')}/> :
          <SortableContext items={rows.map(r => String(r.id))} strategy={verticalListSortingStrategy}>
            <div className="block-list">
              {rows.map(row => <Row key={row.id} id={row.id} command={row.c} depth={row.depth} options={options} locked={locked} selected={selected === row.id} active={activeLine === row.id} failure={failureLine === row.id}
                onSelect={() => setSelected(row.id)} onReplace={c => { const lines = source.split('\n'); lines[row.id] = c; change(lines.join('\n')); }}
                onMove={d => { change(moveBlock(source, row.id, d)); setSelected(Math.max(0, row.id + d)); }}
                onDelete={() => { change(deleteBlock(source, row.id)); setSelected(-1); }}/>)}
              <ProgramEnd disabled={locked} onSelect={() => setSelected(-1)}/>
            </div>
          </SortableContext>}
    </div>
    <DragOverlay>{dragged && <div className={'command-ghost ' + category(dragged)}><GripVertical size={15}/>{blockFields(dragged).verb} {blockFields(dragged).value}</div>}</DragOverlay>
  </DndContext>;
}
