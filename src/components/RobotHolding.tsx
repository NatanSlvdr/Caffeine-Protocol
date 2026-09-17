import type { ActorSnapshot, Cargo, OrderTicket } from '../domain/types';
import { Bean, Droplets, Leaf, ScrollText, CupSoda } from 'lucide-react';
import { BlockIcon } from './BlockIcon';
import { blockFields } from '../domain/blockFields';
import { OperandIcon } from './OperandIcon';
import { ModelThumbnail } from './ModelThumbnail';

/** Describe the recorded cargo stage rather than showing every item as a finished cup. */
function cargoLabel(cargo: Cargo) {
  const drink = cargo.item === 'tea' ? 'Tea' : 'Coffee';
  switch (cargo.stage) {
    case 'claimed': return `${drink} order ticket`;
    case 'beans': return 'Coffee beans';
    case 'ground': return 'Ground coffee';
    case 'leaves': return 'Tea leaves';
    case 'water': return cargo.item === 'tea' ? 'Tea leaves + water' : 'Ground coffee + water';
    case 'brewed': return drink + (cargo.sugar ? ` · ${cargo.sugar} sugar` : ' · No sugar');
    case 'dirty': return 'Dirty cup';
  }
}

/** Use the same drink models as the editor, with small badges for paper and preparation. */
function HoldingIcon({ item, stage }: { item?: string; stage: Cargo['stage'] | 'paper' }) {
  if (stage === 'beans' || stage === 'ground') return <Bean size={36} aria-hidden="true"/>;
  if (stage === 'leaves') return <Leaf size={36} aria-hidden="true"/>;
  if (stage === 'dirty') return <CupSoda size={36} aria-hidden="true"/>;
  if (!item) return <ScrollText size={36} aria-hidden="true"/>;
  return <><ModelThumbnail model={item === 'tea' ? 'tea' : 'coffee'}/>
    {(stage === 'claimed' || stage === 'paper') && <ScrollText className="holding-badge" size={16} aria-hidden="true"/>}
    {stage === 'water' && <Droplets className="holding-badge" size={16} aria-hidden="true"/>}
  </>;
}

/** Show physical actions above inventory and memory; control flow has no action animation. */
export function RobotHolding({ name, inventory, paper, action, variables, paused=false, reduced=false }: { name: string; inventory: Cargo[]; paper?: OrderTicket; action?:ActorSnapshot['action']; variables?:ActorSnapshot['variables']; paused?:boolean; reduced?:boolean }) {
  const memory=Object.entries(variables??{}).filter((entry):entry is [string,number]=>entry[1]!==undefined);
  const fields=action?blockFields(action.command):undefined;
  const visibleAction=fields && ['TAKE','DEPOSIT','ITEM','STORE','MOVE'].includes(fields.family) ? action : undefined;
  if (!paper && !inventory.length && !visibleAction && !memory.length) return null;
  const actionLabel=action?.command.startsWith('STORE ')?`Store ${action.command.split(' ')[1].replace('var','var ')} in memory`:fields?`${fields.verb} ${fields.value}`.trim():'';
  const paperLabel = paper ? (paper.item ? `${paper.item === 'tea' ? 'Tea' : 'Coffee'} order paper` : 'Blank order paper')
    + (paper.sugar_count !== null ? ` · ${paper.sugar_count} sugar` : paper.with_sugar !== null ? paper.with_sugar ? ' · With sugar' : ' · No sugar' : '') : '';
  return <div className="robot-holding" data-motion={reduced?'reduced':undefined} style={{animationPlayState:paused?'paused':'running'}} aria-label={`${name} is holding`}>
    {visibleAction&&<div className="robot-action" aria-label={`${name}: ${actionLabel}`}><span className="robot-action-icon" style={{transform:reduced?undefined:`translateY(${Math.sin(visibleAction.progress*Math.PI*8)*2}px) rotate(${Math.sin(visibleAction.progress*Math.PI*6)*10}deg)`}}><BlockIcon command={visibleAction.command}/></span><span>{actionLabel}</span><progress aria-label="Action progress" value={visibleAction.progress} max={1}/></div>}
    {(paper || inventory.length > 0) && <ul aria-label={`${name} inventory`}>
      {paper && <li key={`${paper.ticket_id}:${paper.item}:${paper.quantity}:${paper.sugar_count}`} title={paperLabel} aria-label={paperLabel}><HoldingIcon item={paper.item} stage="paper"/>{(paper.quantity??1)>1&&<span className="order-quantity">×{paper.quantity}</span>}{paper.sugar_count!==null&&<span className="holding-sugar"><ModelThumbnail model="sugar"/>{paper.sugar_count}</span>}</li>}
      {inventory.map(cargo => {
        const label = cargoLabel(cargo) + (cargo.table > 0 ? ` · Table ${cargo.table}` : '');
        return <li key={`${cargo.ticketId}:${cargo.stage}:${cargo.sugar}`} title={label} aria-label={label}>
          <HoldingIcon item={cargo.item} stage={cargo.stage}/>
          {cargo.stage === 'brewed' && cargo.sugar > 0 && <span className="holding-sugar" aria-hidden="true"><ModelThumbnail model="sugar"/>{cargo.sugar}</span>}
        </li>;
      })}
    </ul>}
    {!!memory.length&&<div className="robot-memory" aria-label={`${name} memory`}>{memory.map(([variable,value])=><span key={variable}><OperandIcon value={variable}/>{variable.replace('var','var ')} = {value}</span>)}</div>}
  </div>;
}
