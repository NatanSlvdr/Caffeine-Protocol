import { ScanEye } from 'lucide-react';
import { useId } from 'react';
import type { RobotState } from './inspector';

export interface RobotInspectorProps {
  state: RobotState;
  /** Whether the robot reads a guest's order, as Query does, or a ticket, as Brew and Porter do. */
  reads: 'guest' | 'ticket';
  /** When the service is paused, like "Round 2 · 42.0 s". */
  when: string;
  /** Why the service paused itself, when it did, like "At Brew’s mark". */
  reason?: string;
}

const Unset = ({ children }: { children: string }) => <span className="inspector-unset">{children}</span>;

/**
 * The open robot at the paused moment, under its routine: what it is doing, the guest or ticket it is on, what it
 * carries, what its memory holds, and where it is in a For loop. Everything comes from the run's records, so a slot
 * the robot has stored nothing in says "not set" rather than showing a guess.
 */
export function RobotInspector({ state, reads, when, reason }: RobotInspectorProps) {
  const heading = useId();
  return (
    <aside className="robot-inspector" aria-labelledby={heading}>
      <header>
        <p id={heading}>
          <ScanEye size={14} aria-hidden="true" />
          {state.robot}, paused
        </p>
        {reason && <span className="inspector-reason">{reason}</span>}
        <span className="inspector-when">{when}</span>
      </header>
      <dl>
        <div>
          <dt>Doing</dt>
          <dd>
            {state.doing}
            {state.at && <span className="inspector-block">{state.at}</span>}
          </dd>
        </div>
        <div>
          <dt>{reads === 'guest' ? 'Guest' : 'Ticket'}</dt>
          <dd>{state.order ?? <Unset>None</Unset>}</dd>
        </div>
        <div>
          <dt>Holding</dt>
          <dd>
            {state.holding.length ? (
              state.holding.map((item, i) => <span key={i}>{item}</span>)
            ) : (
              <Unset>Nothing</Unset>
            )}
          </dd>
        </div>
        <div>
          <dt>Memory</dt>
          <dd>
            {state.memory.length ? (
              state.memory.map((slot) => (
                <span key={slot.name}>
                  {slot.name} {slot.value !== undefined ? <strong>= {slot.value}</strong> : <Unset>not set</Unset>}
                </span>
              ))
            ) : (
              <Unset>No Vars in this routine</Unset>
            )}
          </dd>
        </div>
        <div>
          <dt>Loop</dt>
          <dd>{state.loop ?? <Unset>Not in a loop</Unset>}</dd>
        </div>
      </dl>
    </aside>
  );
}
