import type { Cargo, OrderTicket } from '../domain/types';
import { Bean, Droplets, Leaf, ScrollText, Sparkles, CupSoda } from 'lucide-react';
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

/** Empty inventories have no bubble; item descriptions remain accessible without visible text. */
export function RobotHolding({ name, inventory, paper }: { name: string; inventory: Cargo[]; paper?: OrderTicket }) {
  if (!paper && !inventory.length) return null;
  const paperLabel = paper ? (paper.item ? `${paper.item === 'tea' ? 'Tea' : 'Coffee'} order paper` : 'Blank order paper')
    + (paper.sugar_count !== null ? ` · ${paper.sugar_count} sugar` : paper.with_sugar !== null ? paper.with_sugar ? ' · With sugar' : ' · No sugar' : '') : '';
  return <div className="robot-holding" aria-label={`${name} is holding`}>
    <ul>
      {paper && <li title={paperLabel} aria-label={paperLabel}><HoldingIcon item={paper.item} stage="paper"/>{(paper.quantity??1)>1&&<span className="order-quantity">×{paper.quantity}</span>}</li>}
      {inventory.map(cargo => {
        const label = cargoLabel(cargo) + (cargo.table > 0 ? ` · Table ${cargo.table}` : '');
        return <li key={cargo.ticketId} title={label} aria-label={label}>
          <HoldingIcon item={cargo.item} stage={cargo.stage}/>
          {cargo.stage === 'brewed' && cargo.sugar > 0 && <span className="holding-sugar" aria-hidden="true"><Sparkles size={10}/>{cargo.sugar}</span>}
        </li>;
      })}
    </ul>
  </div>;
}
