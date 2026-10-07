import { useId, useState } from 'react';
import { ArrowDown, ArrowUp, Equal } from 'lucide-react';
import { Modal } from '@/components';
import { ROBOT_DISPLAY_NAMES, type LevelDefinition, type RobotRole, type RunRecord } from '@/domain';
import { useWords } from '@/shared/language';
import { compareRuns, comparableTo, latestPair, routineChanges, runName } from '../compare';
import { andList } from '../hints';
import { COMPARE_WORDS } from './compareWords';
import { OPTIONS_WORDS } from './optionsWords';

export interface CompareModalProps {
  level: LevelDefinition;
  /** This visit's finished runs, oldest first. */
  records: readonly RunRecord[];
  /** The robots the player programs this shift, whose routines can have changed. */
  crew: readonly RobotRole[];
  /** The run to open on, set against the latest run before it that played the same rounds. */
  initial?: RunRecord;
  onClose: () => void;
}

const CHANGE_ICON = { better: ArrowUp, worse: ArrowDown, same: Equal } as const;

/**
 * Two of this visit's runs that played the same rounds, side by side: what each got right, its size and steps, and,
 * where both were served, its time, the guests' mood and its stars; then what changed in each robot's routine
 * between them, kept from the runs themselves, so the change can be read whatever the routines say now.
 */
export function CompareModal({ level, records, crew, initial, onClose }: CompareModalProps) {
  const words = useWords(COMPARE_WORDS);
  // A routine's changed lines are counted and marked the way the restore window does it.
  const diffWords = useWords(OPTIONS_WORDS).diff;
  const [opening] = useState(() => {
    const earlier = initial && comparableTo(records, initial).find((r) => r.id < initial.id);
    return initial && earlier ? ([earlier, initial] as const) : latestPair(records);
  });
  const [afterId, setAfterId] = useState(opening?.[1].id);
  const [beforeId, setBeforeId] = useState(opening?.[0].id);
  const after = records.find((r) => r.id === afterId);
  const choices = after ? comparableTo(records, after) : [];
  const before = choices.find((r) => r.id === beforeId) ?? choices[0];
  const pickable = records.filter((r) => comparableTo(records, r).length > 0).reverse();
  const heading = useId(),
    changes = useId();
  const rows = before && after ? compareRuns(level, before, after, words) : [];
  const routines = before && after ? routineChanges(crew, before, after) : [];
  const changed = routines.filter((r) => r.added + r.removed > 0);
  const same = routines.filter((r) => r.added + r.removed === 0);
  return (
    <Modal
      className="settings-window confirm-slip compare-slip"
      kicker={words.kicker}
      title={words.title}
      onClose={onClose}
    >
      {!after || !before ? (
        <p>{words.none}</p>
      ) : (
        <>
          <div className="compare-pick">
            <label>
              <span>{words.before}</span>
              <select value={before.id} onChange={(e) => setBeforeId(Number(e.target.value))}>
                {choices.map((r) => (
                  <option key={r.id} value={r.id}>
                    {runName(level, r, words)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{words.after}</span>
              <select
                value={after.id}
                onChange={(e) => {
                  const next = records.find((r) => r.id === Number(e.target.value))!;
                  setAfterId(next.id);
                  // Keep the run it is set against when it played the same rounds; otherwise the latest that did.
                  if (!comparableTo(records, next).some((r) => r.id === before.id))
                    setBeforeId(comparableTo(records, next)[0]?.id);
                }}
              >
                {pickable.map((r) => (
                  <option key={r.id} value={r.id}>
                    {runName(level, r, words)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <table className="compare-table" aria-labelledby={heading}>
            <caption id={heading} className="sr-only">
              {words.caption(before.id, after.id)}
            </caption>
            <thead>
              <tr>
                <td />
                <th scope="col">{words.run(before.id)}</th>
                <th scope="col">{words.run(after.id)}</th>
                <th scope="col">{words.change}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const Icon = row.change && CHANGE_ICON[row.change];
                return (
                  <tr key={row.label} className={row.change ?? 'unjudged'}>
                    <th scope="row">{row.label}</th>
                    <td>{row.before}</td>
                    <td>{row.after}</td>
                    <td className="compare-change">
                      {Icon ? (
                        <>
                          <Icon size={13} aria-hidden="true" />
                          {row.delta ?? words.changes[row.change!]}
                          {row.change !== 'same' && <span className="sr-only">, {words.changes[row.change!]}</span>}
                        </>
                      ) : (
                        <span title={row.note}>
                          —<span className="sr-only">{row.note}</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.some((row) => row.note) && <p className="compare-note">{rows.find((row) => row.note)!.note}</p>}
          <section className="compare-routines" aria-labelledby={changes}>
            <h3 id={changes}>{words.routines}</h3>
            {changed.length === 0 && <p>{words.allSame(crew.length > 1)}</p>}
            {changed.map((routine) => (
              <div key={routine.role} className="restore-compare">
                <p className="restore-compare-title">
                  {ROBOT_DISPLAY_NAMES[routine.role]}
                  <span>
                    {[
                      routine.added && diffWords.change(routine.added, 'in'),
                      routine.removed && diffWords.change(routine.removed, 'out'),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </p>
                <ol
                  className="restore-diff"
                  aria-label={words.diff(ROBOT_DISPLAY_NAMES[routine.role], before.id, after.id)}
                >
                  {routine.diff.map((line, i) => (
                    <li key={i} className={line.kind}>
                      <span className="restore-diff-mark" aria-hidden="true">
                        {line.kind === 'add' ? '+' : line.kind === 'remove' ? '−' : ''}
                      </span>
                      {line.kind !== 'same' && (
                        <span className="sr-only">{diffWords.mark(line.kind === 'add' ? 'in' : 'out')}</span>
                      )}
                      <code>{line.text}</code>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
            {changed.length > 0 && same.length > 0 && (
              <p className="compare-same">
                {words.sameRoutine(
                  andList(
                    same.map((r) => ROBOT_DISPLAY_NAMES[r.role]),
                    words.and,
                  ),
                )}
              </p>
            )}
          </section>
        </>
      )}
      <div className="modal-buttons">
        <button className="settings-chip" data-autofocus onClick={onClose}>
          {words.done}
        </button>
      </div>
    </Modal>
  );
}
