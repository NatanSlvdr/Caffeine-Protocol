import { ScanEye } from 'lucide-react';
import { useId } from 'react';
import { useUntranslated, useWords } from '@/shared/language';
import type { RobotState } from './inspector';
import { PAUSE_WORDS } from './pauseWords';

export interface RobotInspectorProps {
  state: RobotState;
  /** Whether the robot reads a guest's order, as Query does, or a ticket, as Brew and Porter do. */
  reads: 'guest' | 'ticket';
  /** When the service is paused, like "Round 2 · 42.0 s". */
  when: string;
  /** Looking back at an earlier moment of the run, rather than where it paused. */
  earlier?: boolean;
  /** Why the service paused itself, when it did, like "At Brew’s mark". */
  reason?: string;
}

const Unset = ({ children }: { children: string }) => <span className="inspector-unset">{children}</span>;

/**
 * The open robot at the paused moment, or an earlier one looked back on, under its routine: what it is doing, the
 * guest or ticket it is on, what it carries, what keeps warm on a shift where drinks go cold, what its memory holds,
 * and where it is in a For loop. Everything comes from the run's records, so a slot the robot has stored nothing in
 * says "not set" rather than showing a guess. What a guest said stays in their words.
 */
export function RobotInspector({ state, reads, when, earlier, reason }: RobotInspectorProps) {
  const heading = useId();
  const say = useWords(PAUSE_WORDS).inspector,
    english = useUntranslated();
  return (
    <aside className="robot-inspector" aria-labelledby={heading}>
      <header>
        <p id={heading}>
          <ScanEye size={14} aria-hidden="true" />
          {say.title(state.robot, !!earlier)}
        </p>
        {reason && <span className="inspector-reason">{reason}</span>}
        <span className="inspector-when">{when}</span>
      </header>
      <dl>
        <div>
          <dt>{say.doing}</dt>
          <dd>
            {state.doing}
            {state.at && <span className="inspector-block">{state.at}</span>}
          </dd>
        </div>
        <div>
          <dt>{reads === 'guest' ? say.guest : say.ticket}</dt>
          <dd>
            {state.order === undefined ? (
              <Unset>{say.none}</Unset>
            ) : (
              <span lang={state.said ? english : undefined}>{state.order}</span>
            )}
          </dd>
        </div>
        <div>
          <dt>{say.holding}</dt>
          <dd>
            {state.holding.length ? (
              state.holding.map((item, i) => <span key={i}>{item}</span>)
            ) : (
              <Unset>{say.nothing}</Unset>
            )}
          </dd>
        </div>
        {state.warm && (
          <div>
            <dt>{say.warm}</dt>
            <dd>
              {state.warm.length ? (
                state.warm.map((drink, i) => <span key={i}>{drink}</span>)
              ) : (
                <Unset>{say.nothingWaiting}</Unset>
              )}
            </dd>
          </div>
        )}
        <div>
          <dt>{say.memory}</dt>
          <dd>
            {state.memory.length ? (
              state.memory.map((slot) => (
                <span key={slot.name}>
                  {slot.name} {slot.value !== undefined ? <strong>= {slot.value}</strong> : <Unset>{say.notSet}</Unset>}
                </span>
              ))
            ) : (
              <Unset>{say.noVars}</Unset>
            )}
          </dd>
        </div>
        <div>
          <dt>{say.loop}</dt>
          <dd>{state.loop ?? <Unset>{say.notInLoop}</Unset>}</dd>
        </div>
      </dl>
    </aside>
  );
}
