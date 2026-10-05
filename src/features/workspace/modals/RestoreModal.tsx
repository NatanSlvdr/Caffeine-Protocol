import { useState } from 'react';
import { Modal } from '@/components';
import { Button } from '@/shared/ui/Button';
import { RUN_MODIFIER } from '@/shared/lib/format';
import { sameRoutine, type RoutineVersion } from '../versions';
import { RoutineDiff } from './RoutineDiff';

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
  const [chosen, setChosen] = useState(() => versions.find((v) => !sameRoutine(v.source, current))?.id);
  const version = versions.find((v) => v.id === chosen);
  return (
    <Modal
      className="settings-window confirm-slip restore-slip"
      kicker="Workspace options"
      title={`Restore ${robot}’s routine`}
      onClose={onClose}
    >
      <fieldset className="restore-versions">
        <legend className="sr-only">Version to restore</legend>
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
                <small>{same ? `The same as ${robot}’s routine now.` : v.detail}</small>
              </span>
            </label>
          );
        })}
      </fieldset>
      {version && <RoutineDiff robot={robot} current={current} next={version.source} />}
      <p>
        Only {robot}’s routine changes{alone ? '' : '; the other robots keep theirs'}. Undo ({RUN_MODIFIER} Z) brings
        yours back.
      </p>
      <div className="modal-buttons">
        <button className="settings-chip" data-autofocus onClick={onClose}>
          Keep my edits
        </button>
        <Button variant="primary" disabled={!version} onClick={() => version && onRestore(version)}>
          Restore this version
        </Button>
      </div>
    </Modal>
  );
}
