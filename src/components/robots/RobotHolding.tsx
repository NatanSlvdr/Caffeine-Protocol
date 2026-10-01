import type { ActorSnapshot, Cargo, OrderTicket, VariableValue } from '@/domain';
import { blockFields, cargoLabel, parseSugarWrite, placeLabel, variableLabels } from '@/domain';
import type { CastId } from '@/domain/dialogue';
import { cast } from '@/data/campaign/cast';
import { Coffee, Settings } from 'lucide-react';
import { BlockIcon } from '../BlockIcon';
import { BubbleTail } from '../BubbleTail';
import { robotIcons } from '../RobotChoice';
import { category } from '../editor/blockMeta';
import { OperandIcon } from '../OperandIcon';
import { ModelThumbnail } from '../thumbnails/ModelThumbnail';
import { OrderMarks } from '../OrderIcons';
import { AutoHeight } from '@/shared/ui/AutoHeight';
import { HoldingIcon } from './HoldingIcon';

/** Ink or paper, whichever reads better on a pill of this colour. */
function pillInk(hex: string) {
  const [r, g, b] = [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b > 140 ? '#392b24' : '#fffcf4';
}

/**
 * Show waiting and physical actions, with a shared thinking state for control flow. The bubble is a
 * comic speech bubble under a name pill in the speaker's cutscene colour, and the action wears the
 * colour of the code block running.
 */
export function RobotHolding({
  name,
  crew,
  inventory,
  paper,
  action,
  variables,
  paused = false,
  reduced = false,
}: {
  name: string;
  /** Crew post, for the name pill's icon. */
  crew?: string;
  inventory: Cargo[];
  paper?: OrderTicket;
  action?: ActorSnapshot['action'];
  variables?: ActorSnapshot['variables'];
  paused?: boolean;
  reduced?: boolean;
}) {
  const memory = Object.entries(variables ?? {}).filter(
    (entry): entry is [string, VariableValue] => entry[1] !== undefined,
  );
  const fields = action ? blockFields(action.command) : undefined;
  const thinking =
    !!fields &&
    ['IF', 'ELSE', 'FOR', 'END', 'JUMP', 'CALL', 'RETURN', 'FUNCTION', 'READ', 'POSITION'].includes(fields.family);
  const visibleAction =
    fields &&
    (thinking || ['TAKE', 'DEPOSIT', 'USE', 'ITEM', 'STORE', 'MOVE', 'MOVE TO', 'WAIT'].includes(fields.family))
      ? action
      : undefined;
  if (!paper && !inventory.length && !visibleAction && !memory.length) return null;
  const actionLabel = thinking
    ? 'Thinking'
    : action?.command.startsWith('STORE ')
      ? `Store ${variableLabels(action.command.split(' ')[1])} in memory`
      : action && parseSugarWrite(action.command) !== undefined
        ? `Write ${variableLabels(parseSugarWrite(action.command)!)} Sugar`
        : fields
          ? variableLabels(`${fields.verb} ${fields.value}`).trim()
          : '';
  const paperLabel = paper
    ? (paper.item ? `${paper.item === 'tea' ? 'Tea' : 'Coffee'} order paper` : 'Blank order paper') +
      (paper.sugar_count !== null
        ? ` · ${paper.sugar_count} sugar`
        : paper.with_sugar !== null
          ? paper.with_sugar
            ? ' · With sugar'
            : ' · No sugar'
          : '') +
      (paper.to_go ? ' · To go' : '') +
      (paper.rush ? ' · Rush' : '')
    : '';
  // Robots carry their selector icon; Niko, covering the counter, carries a cup.
  const CrewIcon = (crew && robotIcons[crew as keyof typeof robotIcons]) || Coffee;
  const color = cast[name.toLowerCase() as CastId]?.color ?? '#ecd29b';
  return (
    <AutoHeight
      className="robot-holding"
      contentClassName="robot-holding-content"
      label={`${name} is holding`}
      paused={paused}
      reduced={reduced}
      extraHeight={20}
    >
      <span
        className="robot-name bubble-pill"
        aria-hidden="true"
        style={{ '--pill': color, '--pill-ink': pillInk(color) } as React.CSSProperties}
      >
        <CrewIcon strokeWidth={2.2} />
        {name}
      </span>
      {visibleAction && (
        <div
          className={`robot-action ${category(visibleAction.command)}`}
          role="group"
          aria-label={`${name}: ${actionLabel}`}
        >
          <span
            className={`robot-action-icon action-${thinking ? 'thinking' : fields?.family.toLowerCase()}`}
            aria-hidden="true"
          >
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
          <span
            className={`robot-action-progress${fields?.family === 'WAIT' && !visibleAction.progress ? ' idle' : ''}`}
            aria-hidden="true"
            style={{ '--progress': visibleAction.progress } as React.CSSProperties}
          />
        </div>
      )}
      {(paper || inventory.length > 0) && (
        <ul aria-label={`${name} inventory`}>
          {paper && (
            <li
              key={`${paper.ticket_id}:${paper.item}:${paper.quantity}:${paper.sugar_count}`}
              title={paperLabel}
              aria-label={paperLabel}
            >
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
              <OrderMarks toGo={paper.to_go} rush={paper.rush} />
            </li>
          )}
          {inventory.map((cargo) => {
            const label = cargoLabel(cargo) + (cargo.table > 0 ? ` · Table ${cargo.table}` : ' · To go');
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
                {cargo.lid && <OrderMarks toGo lid />}
              </li>
            );
          })}
        </ul>
      )}
      {!!memory.length && (
        <div className="robot-memory" role="group" aria-label={`${name} memory`}>
          {memory.map(([variable, value]) => (
            <span key={variable}>
              <OperandIcon value={variable} />
              {variableLabels(variable)} = {typeof value === 'number' ? value : placeLabel(value)}
            </span>
          ))}
        </div>
      )}
      <BubbleTail />
    </AutoHeight>
  );
}
