import { useRef, useState, useEffect, useId, createContext, useContext } from 'react';
import { DndContext, DragOverlay, useDndContext, KeyboardSensor, MeasuringStrategy, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import type { KeyboardCoordinateGetter } from '@dnd-kit/core';
import type { RobotRole } from '../domain/types';
import { robotCommands } from '../domain/robotProgram';
import { blockFields, blockPrototypes, blockVariants } from '../domain/blockFields';
import { normalizeDirection } from '../domain/directions';
import { VARIABLES, STORE_VALUES, parseStore, parseSugarWrite, insideOrderLoop, CONDITION_CONNECTORS, formatConditionExpression, parseConditionExpression, CONDITION_OPERATORS, CONDITION_SOURCES, CONDITION_VALUES, LOOP_VARIABLES, LOOP_SELECTORS, parseFor, parseComparison } from '../domain/program';
import * as robotConditions from '../domain/robotConditions';
import { placeBlock, removeVisualBlock, visualProgram } from '../domain/visualProgram';
import type { VisualBlock } from '../domain/visualProgram';
import { BlockSelect, DirectionSelect } from './BlockSelect';
import { BlockIcon } from './BlockIcon';
import { OperandIcon } from './OperandIcon';
import { ExecutionCursor } from './ExecutionCursor';
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
  return ['FUNCTION', 'CALL', 'RETURN'].includes(family) ? 'function' : family === 'MOVE' ? 'motion' : ['IF', 'ELSE', 'FOR', 'REPEAT', 'JUMP', 'POSITION'].includes(family) ? 'flow' : ['HELP', 'ERROR'].includes(family) ? 'help' : 'action';
}

function operandOption(value: string) {
  const label = blockFields(value).value;
  return { value, label, icon: <OperandIcon value={label}/> };
}

const conditionLabels: Record<string, string> = {
  var1:'var 1',var2:'var 2',var3:'var 3',var4:'var 4',
  coffee: 'Coffee', tea: 'Tea', sugar: 'Sugar', negation: 'Negation', number: 'Number', count: 'Sugar count', ambiguous: 'Ambiguous', item: 'item',
  'CUSTOMER SPEECH': 'Orders', 'heard orders': 'order', 'SUGAR COUNT': 'Sugar count', TRUE: 'True', FALSE: 'False',
  IN: 'in', 'NOT IN': 'not in', '=': '=', '!=': '!=', '<': 'less than', '>': 'greater than', '<=': 'at most', '>=': 'at least',
};
function conditionOption(value: string) {
  return { value, label: conditionLabels[value] ?? value, icon: <OperandIcon value={conditionLabels[value] ?? value}/> };
}
/** Each connector extends the same IF with another editable row, keeping its body intact. */
function membershipOperands(command: string, options: string[], disabled: boolean, label: string, onChange: (value: string) => void, library: boolean, inLoop: boolean) {
  const expression = parseConditionExpression(command);
  if (!expression) return null;
  const values = CONDITION_VALUES.filter(value => expression.conditions.some(condition => condition.left === value) || options.some(candidate => parseComparison(candidate)?.left === value));
  const update = (index: number, key: 'left' | 'operator' | 'right', value: string) => {
    const conditions = expression.conditions.map((condition, at) => at === index ? { ...condition, [key]: value } : condition);
    onChange(formatConditionExpression({ ...expression, conditions }));
  };
  return <span className="if-condition-rows">{expression.conditions.map((condition, index) => {
    const rowLabel = label + (index ? ` condition ${index + 1}` : '');
    const connector = expression.connectors[index] ?? '';
    return <span className="if-comparison-operands" key={index}>
      <BlockSelect label={rowLabel + ' value'} value={library ? '' : condition.left} disabled={disabled} onChange={value => update(index, 'left', value)} options={values.map(conditionOption)}/>
      <BlockSelect label={rowLabel + ' operator'} value={library ? '' : condition.operator} disabled={disabled} onChange={value => update(index, 'operator', value)} options={CONDITION_OPERATORS.map(conditionOption)}/>
      <BlockSelect label={rowLabel + ' source'} value={library ? '' : condition.right} disabled={disabled} onChange={value => update(index, 'right', value)} options={CONDITION_SOURCES.filter(source => source !== 'item' || inLoop).map(conditionOption)}/>
      {!library && <span className={connector ? 'condition-connector' : 'condition-connector optional-connector'} title={connector ? undefined : 'Optional: add another condition'}><BlockSelect label={rowLabel + ' connector'} value={connector} disabled={disabled} options={[{value:'',label:connector ? 'Remove following condition' : '+'}, ...CONDITION_CONNECTORS.map(conditionOption)]} onChange={value => {
        const conditions = [...expression.conditions], connectors = [...expression.connectors];
        if (!value) { conditions.splice(index + 1, 1); connectors.splice(index, 1); }
        else {
          connectors[index] = value === 'AND' ? 'AND' : 'OR';
          if (index === conditions.length - 1) conditions.push({ ...condition });
        }
        onChange(formatConditionExpression({ conditions, connectors }));
      }}/></span>}
    </span>;
  })}</span>;
}

function comparisonOperands(command: string, options: string[], disabled: boolean, label: string, onChange: (key: string, value: string) => void, mask: (key: string, value: string) => string) {
  const membership = options.includes('LISTEN') ? parseComparison(command) : undefined;
  const condition = membership ?? robotConditions.parseComparison(command);
  if (!condition) return null;
  const vocabulary = membership ? CONDITION_VALUES : robotConditions.CONDITION_VALUES;
  const parse = membership ? parseComparison : robotConditions.parseComparison;
  const values = vocabulary.filter(value => value === condition.left || options.some(candidate => candidate === `IF ${value}` || parse(candidate)?.left === value));
  const hasCount = options.some(candidate => candidate === 'IF count' || candidate.startsWith('IF count ')) || condition.left === 'count' || condition.right === 'SUGAR COUNT';
  const sources = membership ? CONDITION_SOURCES : robotConditions.CONDITION_SOURCES.filter(value => value === condition.right || value === 'CUSTOMER SPEECH' || value === 'TRUE' || value === 'FALSE' || hasCount);
  const operators = membership ? CONDITION_OPERATORS : [...new Set([condition.operator, ...robotConditions.CONDITION_OPERATORS])];
  const next = (left: string, operator: string, right: string) => `IF ${left} ${operator} ${right}`;
  return <span className="if-comparison-operands">
    <BlockSelect label={label + ' value'} value={mask('value', condition.left)} disabled={disabled} onChange={value => onChange('value', next(value, condition.operator, condition.right))} options={values.map(conditionOption)}/>
    <BlockSelect label={label + ' operator'} value={mask('operator', condition.operator)} disabled={disabled} onChange={operator => onChange('operator', next(condition.left, operator, condition.right))} options={operators.map(conditionOption)}/>
    <BlockSelect label={label + ' source'} value={mask('source', condition.right)} disabled={disabled} onChange={right => onChange('source', next(condition.left, condition.operator, right))} options={sources.map(conditionOption)}/>
  </span>;
}

function Operands({ command, options, disabled, label, onChange, library = false, inLoop = false }: { command: string; options: string[]; disabled: boolean; label: string; onChange: (value: string) => void; library?: boolean; inLoop?: boolean }) {
  const mask = (_key: string, value: string) => library ? '' : value;
  const select = (_key: string, value: string) => { if (!library) onChange(value); };
  const fields = blockFields(command);
  if (fields.family === 'STORE') {
    const stored=parseStore(command)??{variable:'var1',value:'number'};
    return <span className="assignment-operands">
      <BlockSelect label={label+' variable'} value={stored.variable} disabled={disabled} options={VARIABLES.map(conditionOption)} onChange={variable=>select('variable',`STORE ${variable} FROM ${stored.value}`)}/>
      <span className="assignment-equals">=</span>
      <BlockSelect label={label+' source'} value={stored.value} disabled={disabled} options={STORE_VALUES.map(value=>({...conditionOption(value),label:value==='number'?'Number in item':conditionLabels[value]??value}))} onChange={value=>select('source',`STORE ${stored.variable} FROM ${value}`)}/>
    </span>;
  }
  if (fields.family === 'ITEM') {
    const sugar=parseSugarWrite(command), parts=command.split(' ');
    const quantity=sugar??(parts.length===3?parts[1]:'1'), item=sugar!==undefined?'sugar':parts.at(-1)!;
    const write=(amount:string,ingredient=item)=>ingredient==='sugar'?`WRITE ${amount} sugar`:`ITEM ${amount} ${ingredient}`;
    const variables=options.some(option=>parseStore(option))?VARIABLES:[];
    return <>{item==='sugar'?<BlockSelect label={label + ' quantity'} value={mask('quantity',quantity)} disabled={disabled} options={[...Array.from({length:20},(_,i)=>String(i)),...variables,...(!/^\d+$/.test(quantity)?[quantity]:[])].filter((value,index,values)=>values.indexOf(value)===index).map(conditionOption)} onChange={value=>select('quantity',write(value))}/>:<input className="tile-count" type="number" min={1} max={19} step={1} aria-label={label + ' quantity'} value={library ? '' : quantity} disabled={disabled} onKeyDown={event=>event.stopPropagation()} onChange={event=>{
      const count=Number(event.target.value);
      if(Number.isInteger(count)&&count>=1&&count<=19)select('quantity',write(String(count)));
    }}/>}
      <BlockSelect label={label + ' value'} value={library?'':item==='sugar'?'WRITE 1 sugar':`ITEM ${item}`} disabled={disabled} options={options.filter(option=>/^ITEM (coffee|tea)$/.test(option)||option==='WRITE 1 sugar').map(operandOption)} onChange={value=>{
        const ingredient=value==='WRITE 1 sugar'?'sugar':value.slice(5);
        const amount=/^\d+$/.test(quantity)&&Number(quantity)>0?quantity:'1';
        select('item',ingredient==='sugar'?write(quantity,ingredient):parts.length===2?value:write(amount,ingredient));
      }}/></>;
  }
  if (['MOVE', 'TAKE', 'DEPOSIT'].includes(fields.family)) {
    const [, rawDirection, count = '1'] = command.split(' ');
    const query = options.includes('LISTEN');
    const defaultDirection = fields.family === 'TAKE' ? (options.includes('SERVE') ? 'DOWN' : 'UP') : (query || !options.includes('BREW') ? 'RIGHT' : 'UP');
    const direction = normalizeDirection(rawDirection ?? defaultDirection) ?? defaultDirection;
    const nextCommand = (value: string, nextCount = count) => fields.family === 'MOVE' ? `MOVE ${value} ${nextCount}` : `${fields.family} ${value}`;
    return <><DirectionSelect label={label + ' direction'} value={mask('direction', direction)} disabled={disabled} onChange={v => select('direction', nextCommand(v))}/>
      {fields.family === 'MOVE' && <><input onKeyDown={e => e.stopPropagation()} className="tile-count" type="number" min={1} max={19} step={1} aria-label={label + ' tiles'} value={mask('count', count)} disabled={disabled} onChange={e => {
        const n = Number(e.target.value);
        if (Number.isInteger(n) && n >= 1 && n <= 19) select('count', nextCommand(direction, String(n)));
      }}/><span className="block-verb block-suffix">tiles</span></>}
    </>;
  }
  if (fields.family === 'FOR') {
    const loop = parseFor(command);
    if (!loop) return null;
    return <><BlockSelect label={label + ' variable'} value={mask('variable', loop.variable)} disabled={disabled} onChange={variable => select('variable', `FOR ${variable} IN ${loop.selector}`)} options={LOOP_VARIABLES.map(conditionOption)}/>
      <span className="block-verb block-suffix">in</span><BlockSelect label={label + ' selector'} value={mask('selector', loop.selector)} disabled={disabled} onChange={selector => select('selector', `FOR ${loop.variable} IN ${selector}`)} options={LOOP_SELECTORS.map(conditionOption)}/></>;
  }
  if (fields.family === 'IF') {
    const membership = options.includes('LISTEN') && membershipOperands(command, options, disabled, label, value => select('condition', value), library, inLoop);
    if (membership) return membership;
    const comparison = comparisonOperands(command, options, disabled, label, select, mask);
    if (comparison) return comparison;
  }
  if (!fields.value || ['JUMP', 'POSITION'].includes(fields.family)) return null;
  const variants = blockVariants(command, options);
  if (!variants.includes(command) && command !== 'ITEM heard') variants.unshift(command);
  return <><BlockSelect label={label + (fields.family === 'IF' ? ' condition' : ' value')} value={mask('value', command)} disabled={disabled} onChange={value => select('value', value)}
    options={variants.map(operandOption)}/>{fields.family === 'ITEM' && <span className="block-verb block-suffix">on paper</span>}</>;
}

function CommandTile({ initial, options, disabled, onInsert }: { initial: string; options: string[]; disabled: boolean; onInsert: (command: string) => void }) {
  const command = initial;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: 'library:' + initial, data: { command }, disabled });
  const fields = blockFields(command);
  return <div ref={setNodeRef} className={'command-tile ' + category(command)} style={{ opacity: isDragging ? .4 : 1 }}>
    <button type="button" disabled={disabled} aria-label={'Insert ' + command} onClick={() => onInsert(command)} {...attributes} {...listeners}><BlockIcon command={command}/>{fields.verb}</button>
    <Operands library command={command} options={options} disabled={disabled} label={'Library ' + fields.verb} onChange={() => {}}/>
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

function Row({ block, depth, ordinal, locked, active, failure, failureMessage, onDismissFailure, options, onReplace, inLoop = false }: {
  block: VisualBlock; depth: number; ordinal: number; locked: boolean; active: boolean; failure: boolean; options: string[];
  onReplace: (c: string) => void; inLoop?: boolean;
  failureMessage?: string; onEdit?: () => void; onDismissFailure?: () => void;
}) {
  const { line: id, command } = block;
  const { attributes, listeners, setNodeRef } = useDraggable({ id: String(id), data: { at: id }, disabled: locked });
  const rowRef = useRef<HTMLDivElement | null>(null), target = command.startsWith('POSITION ');
  useEffect(() => {
    if (failure) rowRef.current?.parentElement?.scrollIntoView?.({ block: 'nearest', behavior: 'instant' });
  }, [failure]);
  return <div className="code-row" onClickCapture={failure ? onDismissFailure : undefined}>
    <span className="line-number" style={{ left: -(depth * 42 + 35) }} aria-hidden="true">{String(ordinal).padStart(2, '0')}</span>
    <div ref={node => { setNodeRef(node); rowRef.current = node; }} {...attributes} {...listeners} aria-label={target ? 'Drag jump destination' : 'Drag block ' + ordinal + ' and its group'} aria-disabled={locked} tabIndex={locked ? -1 : 0} className={['block', category(command), target ? 'jump-target' : '', active ? 'active' : '', failure ? 'failure' : ''].join(' ')}
      aria-current={active && !failure ? 'step' : undefined} data-line={id} data-depth={depth} data-jump={command.startsWith('JUMP ') ? command.slice(5) : undefined} data-target={target ? command.slice(9) : undefined}>

      {!target && <><BlockIcon command={command}/><strong className="block-verb">{blockFields(command).verb}</strong><Operands command={command} options={options} disabled={locked} label={'Block ' + (id + 1)} inLoop={inLoop} onChange={onReplace}/></>}
      {target && <span className="sr-only">Jump destination</span>}
    </div>
    {failure && failureMessage && <InstructionError message={failureMessage} anchor={rowRef}/>}
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
        // Short blue routes may pass behind intermediate blocks.
        const bend = Math.min(bounds.width - 8, Math.max(x1,x2) + 24 + Math.min(16,index*4));
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

export function Editor({ role = 'query', source, onChange, level, locked, observation, activeLine = -1, instructionProgress = 0, failureLine = -1, failureMessage, onEdit, textMode, onDismissFailure, stepSeconds = 1.5 }: {
  role?: RobotRole; source: string; onChange: (v: string) => void; level: number; locked: boolean; observation: boolean;
  activeLine?: number; instructionProgress?: number; failureLine?: number; textMode: boolean; stepSeconds?: number;
  failureMessage?: string; onEdit?: () => void; onDismissFailure?: () => void;
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
  // Playback time drives jumps, so pausing and speed changes preserve the midpoint.
  const activeCommand = source.split('\n')[activeLine]?.trim();
  const jumpDestination = activeCommand?.startsWith('JUMP ') && instructionProgress >= .5
    ? rows.find(row => row.command === `POSITION ${activeCommand.slice(5)}`)?.line : undefined;
  // Structural delimiters have no tile; retain a visible anchor instead of blinking out.
  const visibleActiveLine = ['END', 'ELSE'].includes(activeCommand ?? '') && !rows.some(row => row.line === activeLine)
    ? rows.findLast(row => row.line < activeLine)?.line ?? activeLine : activeLine;
  const markerLine = jumpDestination ?? visibleActiveLine;
  const renderBlocks = (blocks: VisualBlock[], depth = 0): React.ReactNode => blocks.map(block => <div className={(block.children ? 'code-scope ' + category(block.command) : 'code-statement') + (draggedLine === block.line ? ' drag-source' : '')} key={block.line}>
    <Row block={block} inLoop={insideOrderLoop(source,block.line)} depth={depth} ordinal={rows.findIndex(r => r.line === block.line) + 1} options={options} locked={disabled} active={activeLine === block.line} failure={visibleFailureLine === block.line} failureMessage={failureMessage} onEdit={onEdit} onDismissFailure={onDismissFailure}
      onReplace={c => { const lines = source.split('\n'); lines[block.line] = c; change(lines.join('\n')); }}/>
    {block.children && <div className="scope-body">
      <Insertion at={block.line + 1} disabled={disabled} hint={block.children.length ? '' : 'Drop a block here'}/>
      {renderBlocks(block.children, depth + 1)}
    </div>}
    {!!block.alternative?.length && <div className={'else-body' + (draggedLine === block.elseLine ? ' drag-source' : '')}>
      <Row block={elseBlock(block)} depth={depth} ordinal={rows.findIndex(r => r.line === block.elseLine) + 1} options={options} locked={disabled} active={activeLine === block.elseLine} failure={visibleFailureLine === block.elseLine} failureMessage={failureMessage} onEdit={onEdit} onDismissFailure={onDismissFailure}
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
      {observation ? null : textMode ? <textarea onClick={failureLine >= 0 ? onDismissFailure : undefined} spellCheck={false} aria-label="Program source" value={source} onChange={e => change(e.target.value)} readOnly={locked} className={'code-input ' + (failureLine >= 0 ? 'code-error' : '')}/> :
        <ProgramSurface root={root}>
          <ExecutionCursor root={root} line={failureLine >= 0 ? -1 : markerLine} stepSeconds={stepSeconds}/>
          <Insertion at={0} disabled={disabled} hint={rows.length ? '' : 'Drop your first block'}/>
          {renderBlocks(tree)}<JumpArrows root={root} source={source} dragging={!!dragged}/>
        </ProgramSurface>}
    </div>
    <DragOverlay dropAnimation={null}>{dragged && <div className="drag-preview floating-code-preview"><ProjectedBlocks blocks={previewBlocks}/></div>}</DragOverlay>
    </DragPreview.Provider>
  </DndContext>;
}
