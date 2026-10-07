import { useState } from 'react';
import { Modal } from '@/components';
import { Button } from '@/shared/ui/Button';
import { RUN_MODIFIER } from '@/shared/lib/format';
import { useWords } from '@/shared/language';
import { sameRoutine, type RoutineVersion } from '../versions';
import { RoutineDiff } from './RoutineDiff';
import { OPTIONS_WORDS } from './optionsWords';

export interface RestoreModalProps {
  /** The robot whose routine goes back: only the open tab changes, the other robots keep theirs. */
  robot: string;
  /** The only robot the player programs this shift: there are no other routines to keep. */
  alone: boolean;
  /** The open routine as it is now, to set each version against. */
  current: string;
  versions: RoutineVersion[];
  onClose: () => void;
  onRestore: (version: RoutineVersion) => void;
}

/**
 * Put one robot's routine back to an earlier version: the last that served this shift, the one carried in from the
 * shift before, or the shift's starter, each named for where it comes from and set line by line against the routine
 * as it is now. A version just like it can't be picked, and Undo brings the player's own back.
 */
export function RestoreModal({ robot, alone, current, versions, onClose, onRestore }: RestoreModalProps) {
  const say = useWords(OPTIONS_WORDS);
  const [chosen, setChosen] = useState(() => versions.find((v) => !sameRoutine(v.source, current))?.id);
  const version = versions.find((v) => v.id === chosen);
  return (
    <Modal
      className="settings-window confirm-slip restore-slip"
      kicker={say.restoring.kicker}
      title={say.restore(robot)}
      onClose={onClose}
    >
      <fieldset className="restore-versions">
        <legend className="sr-only">{say.restoring.legend}</legend>
        {versions.map((v) => {
          const same = sameRoutine(v.source, current);
          return (
            <label key={v.id} className="restore-version">
              <input
                type="radio"
                name="restore-version"
                checked={chosen === v.id}
                disabled={same}
                onChange={() => setChosen(v.id)}
              />
              <span>
                <strong>{v.label}</strong>
                <small>{same ? say.restoring.same(robot) : v.detail}</small>
              </span>
            </label>
          );
        })}
      </fieldset>
      {version && <RoutineDiff robot={robot} current={current} next={version.source} />}
      <p>{say.restoring.only(robot, alone, RUN_MODIFIER)}</p>
      <div className="modal-buttons">
        <button className="settings-chip" data-autofocus onClick={onClose}>
          {say.restoring.keep}
        </button>
        <Button variant="primary" disabled={!version} onClick={() => version && onRestore(version)}>
          {say.restoring.confirm}
        </Button>
      </div>
    </Modal>
  );
}
