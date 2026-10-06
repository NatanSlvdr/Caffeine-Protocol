import { useState } from 'react';
import { ArrowLeft, CircleCheck, CircleX, RotateCcw, Wrench } from 'lucide-react';
import { Modal } from '@/components';
import type { Repair } from '@/data/repairs';
import { ROBOT_DISPLAY_NAMES, count } from '@/domain';
import { exampleHolds, firedActions, TERMINALS, type Terminal, type Wiring } from '@/domain/repair';
import { Button } from '@/shared/ui/Button';
import { useMusicMood } from '@/hooks/useMusicMood';

/**
 * The repair bay: the back room where Niko opens a robot's panel after closing. Each bench's card says what is wrong
 * with it, or the small mend it got; opening the panel lays out its wiring beside the cases it has to get right.
 */
export function RepairBayWindow({
  repairs,
  mended,
  waiting,
  fresh = [],
  onMend,
  onClose,
}: {
  /** The benches open in this café. */
  repairs: readonly Repair[];
  /** The ids of the robots already mended. */
  mended: readonly string[];
  /** How many benches are still to come. */
  waiting: number;
  /** The benches that weren't open when the bay was last opened. */
  fresh?: readonly string[];
  onMend: (repair: Repair) => void;
  onClose: () => void;
}) {
  // The back room, after hours: the café's music comes through the wall.
  useMusicMood('after-hours');
  const [open, setOpen] = useState<Repair>();
  // Back from a bench, its own card's button takes focus again.
  const [left, setLeft] = useState<string>();
  const back = () => {
    setLeft(open?.id);
    setOpen(undefined);
  };
  return (
    <Modal
      className="settings-window specials-window repair-window"
      kicker="Lou’s · Repair bay"
      title={open ? open.title : 'After closing.'}
      onClose={onClose}
      wide
    >
      {open ? (
        <Bench key={open.id} repair={open} onBack={back} onMend={() => onMend(open)} />
      ) : (
        <>
          <p className="specials-intro">
            The scrapyard put the crew’s wires back any old way, and the café has run on Niko’s patches since. Open a
            panel and wire each sensor to what it should set off, until every case on the bench comes out right. None of
            it counts toward stars.
          </p>
          <ul className="specials-list">
            {repairs.map((repair, index) => {
              const done = mended.includes(repair.id);
              const arrived = fresh.includes(repair.id);
              const label = done ? 'Rewire again' : 'Open the panel';
              return (
                <li key={repair.id} className={arrived ? 'new' : undefined}>
                  <div>
                    <h3>{repair.title}</h3>
                    <small>
                      {arrived ? 'New · ' : ''}
                      {ROBOT_DISPLAY_NAMES[repair.robot]} · {done ? 'Mended' : 'On the bench'}
                    </small>
                    <p>{done ? repair.touch : repair.fault}</p>
                  </div>
                  <div className="specials-serve">
                    <Button
                      variant={done ? undefined : 'primary'}
                      // The visible words first, then which robot: every card has a button.
                      aria-label={`${label}, ${repair.title}`}
                      autoFocus={repair.id === left}
                      data-autofocus={(left === undefined && index === 0) || undefined}
                      onClick={() => setOpen(repair)}
                    >
                      <Wrench size={15} aria-hidden="true" />
                      {label}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
          {waiting > 0 && (
            <p className="specials-hint repair-waiting">
              {count(waiting, 'more robot')} {waiting === 1 ? 'comes' : 'come'} to the bench as the shifts go on.
            </p>
          )}
        </>
      )}
    </Modal>
  );
}

/** A terminal as the board's select holds it: '' for nothing, the sensor's id, or the id behind a '!'. */
const toValue = (terminal: Terminal | undefined): string =>
  terminal ? `${terminal.not ? '!' : ''}${terminal.sensor}` : '';
const toTerminal = (value: string): Terminal | undefined =>
  value === '' ? undefined : value.startsWith('!') ? { sensor: value.slice(1), not: true } : { sensor: value };

/** The board as the player has it: the select values per action, empty ones and all. */
type Board = Record<string, string[]>;
const boardFrom = (repair: Repair): Board =>
  Object.fromEntries(
    repair.actions.map(({ id }) => [
      id,
      Array.from({ length: TERMINALS }, (_, at) => toValue(repair.starter[id]?.[at])),
    ]),
  );
const wiringOf = (board: Board): Wiring =>
  Object.fromEntries(
    Object.entries(board).map(([action, values]) => [
      action,
      values.map(toTerminal).filter((terminal): terminal is Terminal => !!terminal),
    ]),
  );

function Bench({ repair, onBack, onMend }: { repair: Repair; onBack: () => void; onMend: () => void }) {
  const [board, setBoard] = useState(() => boardFrom(repair));
  const wiring = wiringOf(board);
  const actionIds = repair.actions.map((action) => action.id);
  const right = repair.examples.filter((example) => exampleHolds(wiring, actionIds, example)).length;
  const mends = right === repair.examples.length;
  const labelOf = (id: string) => repair.actions.find((action) => action.id === id)?.label ?? id;
  const said = (ids: readonly string[]) => (ids.length ? ids.map(labelOf).join(', ') : 'Nothing');
  const wire = (action: string, at: number, value: string) =>
    setBoard((was) => ({ ...was, [action]: was[action].map((each, i) => (i === at ? value : each)) }));
  const robot = ROBOT_DISPLAY_NAMES[repair.robot];
  return (
    <div className="repair-bench">
      <button className="drill-back" onClick={onBack} data-autofocus>
        <ArrowLeft size={15} aria-hidden="true" /> All benches
      </button>
      <p className="repair-fault">{repair.fault}</p>
      <p className="repair-how">
        Wire each of {robot}’s actions to up to two sensors. An action goes off when every sensor wired to it reads as
        set; one wired to nothing never does.
      </p>

      <fieldset className="repair-board">
        <legend>{robot}’s wiring</legend>
        {repair.actions.map((action) => (
          <div key={action.id} className="repair-wire">
            <span className="repair-action">{action.label}</span>
            {board[action.id].map((value, at) => (
              <label key={at} className="repair-terminal">
                <span>{at === 0 ? 'when it' : 'and it'}</span>
                <select
                  aria-label={`${action.label}, ${at === 0 ? 'when' : 'and when'}`}
                  value={value}
                  onChange={(event) => wire(action.id, at, event.target.value)}
                >
                  <option value="">Nothing</option>
                  {repair.sensors.flatMap((sensor) => [
                    <option key={sensor.id} value={sensor.id}>
                      {sensor.is}
                    </option>,
                    <option key={`!${sensor.id}`} value={`!${sensor.id}`}>
                      {sensor.isnt}
                    </option>,
                  ])}
                </select>
              </label>
            ))}
          </div>
        ))}
      </fieldset>

      <table className="repair-cases">
        <caption>The cases on the bench</caption>
        <thead>
          <tr>
            <th scope="col">It meets</th>
            <th scope="col">It should</th>
            <th scope="col">It does</th>
            <th scope="col">
              <span className="sr-only">Right?</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {repair.examples.map((example) => {
            const holds = exampleHolds(wiring, actionIds, example);
            return (
              <tr key={example.input} className={holds ? 'holds' : 'fails'}>
                <th scope="row">
                  {example.input}
                  <small>
                    {repair.sensors
                      .map((sensor) => (example.sensors.includes(sensor.id) ? sensor.is : sensor.isnt))
                      .join(' · ')}
                  </small>
                </th>
                <td>{said(example.actions)}</td>
                <td>{said(firedActions(wiring, actionIds, example.sensors))}</td>
                <td>
                  <span role="img" aria-label={holds ? 'Right' : 'Not yet'}>
                    {holds ? <CircleCheck size={18} aria-hidden="true" /> : <CircleX size={18} aria-hidden="true" />}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="repair-foot">
        <p role="status" className={mends ? 'repair-mends' : undefined}>
          {mends
            ? `All ${repair.examples.length} cases right. ${robot} is ready to close up.`
            : `${right} of ${count(repair.examples.length, 'case')} right.`}
        </p>
        <Button onClick={() => setBoard(boardFrom(repair))}>
          <RotateCcw size={15} aria-hidden="true" />
          Start over
        </Button>
        <Button variant="primary" disabled={!mends} onClick={onMend}>
          <Wrench size={15} aria-hidden="true" />
          Close the panel
        </Button>
      </div>
    </div>
  );
}
