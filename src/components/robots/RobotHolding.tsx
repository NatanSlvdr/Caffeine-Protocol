import type { ActorSnapshot, Cargo, OrderTicket } from '@/domain';
import { blockFields, cargoLabel, variableLabels } from '@/domain';
import { Settings } from 'lucide-react';
import { BlockIcon } from '../BlockIcon';
import { OperandIcon } from '../OperandIcon';
import { ModelThumbnail } from '../thumbnails/ModelThumbnail';
import { AutoHeight } from '@/shared/ui/AutoHeight';
import { HoldingIcon } from './HoldingIcon';

/** Show waiting and physical actions, with a shared thinking state for control flow. */
export function RobotHolding({
  name,
  inventory,
  paper,
  action,
  variables,
  paused = false,
  reduced = false,
}: {
  name: string;
  inventory: Cargo[];
  paper?: OrderTicket;
  action?: ActorSnapshot['action'];
  variables?: ActorSnapshot['variables'];
  paused?: boolean;
  reduced?: boolean;
}) {
  const memory = Object.entries(variables ?? {}).filter((entry): entry is [string, number] => entry[1] !== undefined);
  const fields = action ? blockFields(action.command) : undefined;
  const thinking = !!fields && ['IF', 'ELSE', 'FOR', 'REPEAT', 'END', 'JUMP', 'CALL', 'RETURN', 'FUNCTION', 'READ', 'POSITION'].includes(fields.family);
  const visibleAction =
    fields && (thinking || ['TAKE', 'DEPOSIT', 'ITEM', 'STORE', 'MOVE', 'WAIT'].includes(fields.family)) ? action : undefined;
  if (!paper && !inventory.length && !visibleAction && !memory.length) return null;
  const actionLabel =
    thinking
      ? 'Thinking'
      : action?.command.startsWith('STORE ')
        ? `Store ${variableLabels(action.command.split(' ')[1])} in memory`
        : fields
          ? `${fields.verb} ${fields.value}`.trim()
          : '';
  const paperLabel = paper
    ? (paper.item ? `${paper.item === 'tea' ? 'Tea' : 'Coffee'} order paper` : 'Blank order paper') +
      (paper.sugar_count !== null
        ? ` · ${paper.sugar_count} sugar`
        : paper.with_sugar !== null
          ? paper.with_sugar
            ? ' · With sugar'
            : ' · No sugar'
          : '')
    : '';
  return (
    <AutoHeight className="robot-holding" contentClassName="robot-holding-content" label={`${name} is holding`} paused={paused} reduced={reduced} extraHeight={10}>
      {visibleAction && (
        <div className="robot-action" aria-label={`${name}: ${actionLabel}`}>
          <span className={`robot-action-icon action-${thinking ? 'thinking' : fields?.family.toLowerCase()}`} aria-hidden="true">
            {thinking ? (
              <>
                <Settings className="thinking-gear" strokeWidth={1.8} />
                <Settings className="thinking-gear" strokeWidth={1.8} />
              </>
            ) : (
              <BlockIcon command={visibleAction.command} />
            )}
          </span>
          <span className="robot-action-label">{actionLabel}</span>
        </div>
      )}
      {(paper || inventory.length > 0) && (
        <ul aria-label={`${name} inventory`}>
          {paper && (
            <li key={`${paper.ticket_id}:${paper.item}:${paper.quantity}:${paper.sugar_count}`} title={paperLabel} aria-label={paperLabel}>
              <span className="holding-item-icon">
                <HoldingIcon item={paper.item} stage="paper" />
                {(paper.quantity ?? 1) > 1 && <span className="order-quantity">×{paper.quantity}</span>}
              </span>
              {paper.sugar_count !== null && (
                <span className="holding-sugar">
                  <ModelThumbnail model="sugar" />
                  {paper.sugar_count}
                </span>
              )}
            </li>
          )}
          {inventory.map((cargo) => {
            const label = cargoLabel(cargo) + (cargo.table > 0 ? ` · Table ${cargo.table}` : '');
            return (
              <li key={`${cargo.ticketId}:${cargo.stage}:${cargo.sugar}`} title={label} aria-label={label}>
                <span className="holding-item-icon">
                  <HoldingIcon item={cargo.item} stage={cargo.stage} />
                </span>
                {cargo.stage === 'brewed' && cargo.sugar > 0 && (
                  <span className="holding-sugar" aria-hidden="true">
                    <ModelThumbnail model="sugar" />
                    {cargo.sugar}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {!!memory.length && (
        <div className="robot-memory" aria-label={`${name} memory`}>
          {memory.map(([variable, value]) => (
            <span key={variable}>
              <OperandIcon value={variable} />
              {variableLabels(variable)} = {value}
            </span>
          ))}
        </div>
      )}
    </AutoHeight>
  );
}
