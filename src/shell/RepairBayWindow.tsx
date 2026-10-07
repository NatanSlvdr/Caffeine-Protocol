import { useState } from 'react';
import { ArrowLeft, CircleCheck, CircleX, RotateCcw, Wrench } from 'lucide-react';
import { Modal } from '@/components';
import { repairIn, type Repair } from '@/data/repairs';
import { ROBOT_DISPLAY_NAMES } from '@/domain';
import { exampleHolds, firedActions, TERMINALS, type Terminal, type Wiring } from '@/domain/repair';
import { Button } from '@/shared/ui/Button';
import { useMusicMood } from '@/hooks/useMusicMood';
import { useLanguage, useWords } from '@/shared/language';
import { REPAIR_WORDS } from './repairWords';

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
  const say = useWords(REPAIR_WORDS);
  const [language] = useLanguage();
  const [open, setOpen] = useState<Repair>();
  const shown = open && repairIn(open, language);
  // Back from a bench, its own card's button takes focus again.
  const [left, setLeft] = useState<string>();
  const back = () => {
    setLeft(open?.id);
    setOpen(undefined);
  };
  return (
    <Modal
      className="settings-window specials-window repair-window"
      kicker={say.kicker}
      title={shown ? shown.title : say.title}
      onClose={onClose}
      wide
    >
      {open && shown ? (
        <Bench key={open.id} repair={shown} onBack={back} onMend={() => onMend(open)} />
      ) : (
        <>
          <p className="specials-intro">{say.intro}</p>
          <ul className="specials-list">
            {repairs.map((kept, index) => {
              const repair = repairIn(kept, language);
              const done = mended.includes(repair.id);
              const arrived = fresh.includes(repair.id);
              const label = done ? say.again : say.open;
              return (
                <li key={repair.id} className={arrived ? 'new' : undefined}>
                  <div>
                    <h3>{repair.title}</h3>
                    <small>
                      {arrived ? say.fresh : ''}
                      {ROBOT_DISPLAY_NAMES[repair.robot]} · {done ? say.mended : say.onBench}
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
                      onClick={() => setOpen(kept)}
                    >
                      <Wrench size={15} aria-hidden="true" />
                      {label}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
          {waiting > 0 && <p className="specials-hint repair-waiting">{say.waiting(waiting)}</p>}
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
  const say = useWords(REPAIR_WORDS).bench;
  const [board, setBoard] = useState(() => boardFrom(repair));
  const wiring = wiringOf(board);
  const actionIds = repair.actions.map((action) => action.id);
  const right = repair.examples.filter((example) => exampleHolds(wiring, actionIds, example)).length;
  const mends = right === repair.examples.length;
  const labelOf = (id: string) => repair.actions.find((action) => action.id === id)?.label ?? id;
  const said = (ids: readonly string[]) => (ids.length ? ids.map(labelOf).join(', ') : say.nothing);
  const wire = (action: string, at: number, value: string) =>
    setBoard((was) => ({ ...was, [action]: was[action].map((each, i) => (i === at ? value : each)) }));
  const robot = ROBOT_DISPLAY_NAMES[repair.robot];
  return (
    <div className="repair-bench">
      <button className="drill-back" onClick={onBack} data-autofocus>
        <ArrowLeft size={15} aria-hidden="true" /> {say.back}
      </button>
      <p className="repair-fault">{repair.fault}</p>
      <p className="repair-how">{say.how(robot)}</p>

      <fieldset className="repair-board">
        <legend>{say.wiring(robot)}</legend>
        {repair.actions.map((action) => (
          <div key={action.id} className="repair-wire">
            <span className="repair-action">{action.label}</span>
            {board[action.id].map((value, at) => (
              <label key={at} className="repair-terminal">
                <span>{say.when[at]}</span>
                <select
                  aria-label={`${action.label}, ${say.whenLabel[at]}`}
                  value={value}
                  onChange={(event) => wire(action.id, at, event.target.value)}
                >
                  <option value="">{say.nothing}</option>
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
        <caption>{say.cases}</caption>
        <thead>
          <tr>
            <th scope="col">{say.meets}</th>
            <th scope="col">{say.should}</th>
            <th scope="col">{say.does}</th>
            <th scope="col">
              <span className="sr-only">{say.right}</span>
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
                  <span role="img" aria-label={holds ? say.holds : say.notYet}>
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
          {mends ? say.mends(repair.examples.length, robot) : say.tally(right, repair.examples.length)}
        </p>
        <Button onClick={() => setBoard(boardFrom(repair))}>
          <RotateCcw size={15} aria-hidden="true" />
          {say.over}
        </Button>
        <Button variant="primary" disabled={!mends} onClick={onMend}>
          <Wrench size={15} aria-hidden="true" />
          {say.close}
        </Button>
      </div>
    </div>
  );
}
