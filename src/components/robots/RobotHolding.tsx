import type { ActorSnapshot, Cargo, OrderTicket, VariableValue } from '@/domain';
import { blockFields, parseSugarWrite, variableLabels } from '@/domain';
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
import { useUntranslated, useWords } from '@/shared/language';
import { CARGO_WORDS } from '../cargoWords';
import { SCENE_WORDS } from '../sceneWords';
import { HoldingIcon } from './HoldingIcon';

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
  const say = useWords(SCENE_WORDS);
  const carried = useWords(CARGO_WORDS);
  const english = useUntranslated();
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
  // Past thinking, an action is said as its block reads, in the blocks' own words.
  const actionLabel = thinking
    ? say.thinking
    : action?.command.startsWith('STORE ')
      ? `Store ${variableLabels(action.command.split(' ')[1])} in memory`
      : action && parseSugarWrite(action.command) !== undefined
        ? `Write ${variableLabels(parseSugarWrite(action.command)!)} Sugar`
        : fields
          ? variableLabels(`${fields.verb} ${fields.value}`).trim()
          : '';
  // A hand action names the station it reaches, so a Take at the sugar reads apart from one at the lids.
  const station = !thinking && visibleAction?.at ? say.station(visibleAction.at) : undefined;
  const paperText = paper ? carried.paper(paper) : '';
  // Robots carry their selector icon; Niko, covering the counter, carries a cup.
  const CrewIcon = (crew && robotIcons[crew as keyof typeof robotIcons]) || Coffee;
  const color = cast[name.toLowerCase() as CastId]?.color ?? '#ecd29b';
  return (
    <AutoHeight
      className="robot-holding"
      contentClassName="robot-holding-content"
      label={say.holding(name)}
      paused={paused}
      reduced={reduced}
      extraHeight={20}
    >
      <span className="robot-name bubble-pill" aria-hidden="true" style={{ '--pill': color } as React.CSSProperties}>
        <CrewIcon strokeWidth={2.2} />
        {name}
      </span>
      {visibleAction && (
        <div
          className={`robot-action ${category(visibleAction.command)}`}
          role="group"
          aria-label={say.action(name, actionLabel, station)}
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
          <span className="robot-action-label">
            {thinking ? actionLabel : <span lang={english}>{actionLabel}</span>}
            {station && <span className="robot-action-at"> · {station}</span>}
          </span>
          <span
            className={`robot-action-progress${fields?.family === 'WAIT' && !visibleAction.progress ? ' idle' : ''}`}
            aria-hidden="true"
            style={{ '--progress': visibleAction.progress } as React.CSSProperties}
          />
        </div>
      )}
      {(paper || inventory.length > 0) && (
        <ul aria-label={say.inventory(name)}>
          {paper && (
            <li
              key={`${paper.ticket_id}:${paper.item}:${paper.quantity}:${paper.sugar_count}`}
              title={paperText}
              aria-label={paperText}
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
              <OrderMarks toGo={paper.to_go} rush={paper.rush} together={paper.together} />
            </li>
          )}
          {inventory.map((cargo) => {
            const label = carried.held(cargo);
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
        <div className="robot-memory" role="group" aria-label={say.memory(name)}>
          {memory.map(([variable, value]) => (
            <span key={variable}>
              <OperandIcon value={variable} />
              {variableLabels(variable)} = {typeof value === 'number' ? value : carried.place(value)}
            </span>
          ))}
        </div>
      )}
      <BubbleTail />
    </AutoHeight>
  );
}
