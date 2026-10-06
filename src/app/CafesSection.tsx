import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Download, Plus, Store } from 'lucide-react';
import { lessons } from '@/data';
import { Modal } from '@/components';
import { Button } from '@/shared/ui/Button';
import { download, saveFileName } from '@/shared/lib/download';
import {
  CAFE_NAME_MAX,
  MAX_CAFES,
  cafeKey,
  cleanCafeName,
  nextCafeName,
  parseSave,
  type CafeEntry,
} from '@/features/campaign/save/persistence';
import type { ProgressSave } from '@/domain';
import { useGame } from '@/state/GameStore';
import { useAnnouncement } from '@/hooks/useAnnouncement';
import { FRESH, holds } from './cafeWords';

/** A café's progress as kept, or nothing when it has none yet or it doesn't read. */
function keptSave(id: string): ProgressSave | undefined {
  try {
    const raw = localStorage.getItem(cafeKey(id));
    return raw ? parseSave(raw, lessons) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The cafés kept in this browser, each its own playthrough: open another, name them, add one, or remove one this tab
 * isn't playing. The open café can also start over, which asks first.
 */
export function CafesSection({ onStartOver }: { onStartOver: () => void }) {
  const { save, cafes, cafeId, openCafe, addCafe, renameCafe, removeCafe } = useGame();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [renaming, setRenaming] = useState<string>();
  const [label, setLabel] = useState('');
  const [removing, setRemoving] = useState<{ cafe: CafeEntry; save?: ProgressSave }>();
  const [said, say] = useAnnouncement();
  const [exported, sayExported] = useAnnouncement();
  const [error, setError] = useState('');
  // Where focus goes once the change it follows is on screen.
  const focusNext = useRef('');
  useEffect(() => {
    if (!focusNext.current) return;
    document.getElementById(focusNext.current)?.focus();
    focusNext.current = '';
  });

  const full = cafes.cafes.length >= MAX_CAFES;
  const summary = (cafe: CafeEntry) => {
    const kept = cafe.id === cafeId ? save : keptSave(cafe.id);
    return kept ? holds(kept) || 'No shifts served yet' : 'No shifts served yet';
  };
  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!cleanCafeName(name)) return;
    if (!addCafe(name)) setError('This browser wouldn’t keep another café. Your cafés are as they were.');
  };
  const rename = (e: FormEvent, cafe: CafeEntry) => {
    e.preventDefault();
    if (!cleanCafeName(label)) return;
    if (!renameCafe(cafe.id, label)) return setError('This browser wouldn’t keep the new name.');
    setRenaming(undefined);
    focusNext.current = `cafe-rename-${cafe.id}`;
    say(`Renamed “${cafe.name}”.`);
  };

  return (
    <section className="settings-block cafes-block">
      <h3>
        <Store size={16} aria-hidden="true" /> Cafés in this browser
      </h3>
      <p>Each café keeps its own progress, routines and settings. Your routine notebook is shared by them all.</p>
      <ul className="cafe-list" aria-label="Cafés">
        {cafes.cafes.map((cafe) => {
          const open = cafe.id === cafeId;
          return (
            <li key={cafe.id} className={open ? 'open' : undefined}>
              {renaming === cafe.id ? (
                <form className="cafe-rename" onSubmit={(e) => rename(e, cafe)}>
                  <input
                    id="cafe-label"
                    type="text"
                    value={label}
                    maxLength={CAFE_NAME_MAX}
                    autoComplete="off"
                    spellCheck={false}
                    aria-label={`New name for ${cafe.name}`}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setLabel(e.target.value)}
                  />
                  <button type="submit" className="settings-chip" disabled={!cleanCafeName(label)}>
                    Save
                  </button>
                  <button
                    type="button"
                    className="settings-chip"
                    onClick={() => {
                      setRenaming(undefined);
                      focusNext.current = `cafe-rename-${cafe.id}`;
                    }}
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <>
                  <span className="cafe-name">
                    <strong>{cafe.name}</strong>
                    <small>
                      {open && <span className="cafe-open">Open now · </span>}
                      {summary(cafe)}
                    </small>
                  </span>
                  <span className="cafe-buttons">
                    {!open && (
                      <button
                        className="settings-chip"
                        aria-label={`Open ${cafe.name}`}
                        onClick={() => openCafe(cafe.id)}
                      >
                        Open
                      </button>
                    )}
                    <button
                      id={`cafe-rename-${cafe.id}`}
                      className="settings-chip"
                      aria-label={`Rename ${cafe.name}`}
                      onClick={() => {
                        setRenaming(cafe.id);
                        setLabel(cafe.name);
                        setError('');
                        focusNext.current = 'cafe-label';
                      }}
                    >
                      Rename
                    </button>
                    {!open && (
                      <Button
                        variant="outline-danger"
                        className="settings-chip"
                        aria-label={`Remove ${cafe.name}`}
                        aria-haspopup="dialog"
                        onClick={() => {
                          setError('');
                          sayExported('');
                          setRemoving({ cafe, save: keptSave(cafe.id) });
                        }}
                      >
                        Remove
                      </Button>
                    )}
                  </span>
                </>
              )}
            </li>
          );
        })}
      </ul>

      {adding ? (
        <form className="notebook-keep cafe-add" onSubmit={add}>
          <label htmlFor="cafe-new-name">Name the new café</label>
          <div>
            <input
              id="cafe-new-name"
              type="text"
              value={name}
              maxLength={CAFE_NAME_MAX}
              autoComplete="off"
              spellCheck={false}
              aria-describedby="cafe-new-note"
              onFocus={(e) => e.target.select()}
              onChange={(e) => setName(e.target.value)}
            />
            <button type="submit" className="settings-chip" disabled={!cleanCafeName(name)}>
              Open it
            </button>
            <button
              type="button"
              className="settings-chip"
              onClick={() => {
                setAdding(false);
                focusNext.current = 'cafe-add';
              }}
            >
              Cancel
            </button>
          </div>
          <small id="cafe-new-note">
            It opens at the very start, with these settings. The page reloads, and a service under way starts over.
          </small>
        </form>
      ) : (
        <div className="settings-actions">
          <button
            id="cafe-add"
            className="settings-chip"
            disabled={full}
            aria-describedby={full ? 'cafe-full' : undefined}
            onClick={() => {
              setAdding(true);
              setName(nextCafeName(cafes));
              setError('');
              focusNext.current = 'cafe-new-name';
            }}
          >
            <Plus size={15} aria-hidden="true" /> Add a café
          </button>
          <Button variant="outline-danger" className="settings-chip" aria-haspopup="dialog" onClick={onStartOver}>
            Start this café over
          </Button>
        </div>
      )}
      {full && (
        <small id="cafe-full">{MAX_CAFES} cafés is as many as one browser keeps: remove one to add another.</small>
      )}
      <p className="settings-status" role="status">
        {said}
      </p>
      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}

      {removing && (
        <Modal
          className="settings-window confirm-slip"
          kicker="Cafés in this browser"
          title="Remove this café?"
          onClose={() => setRemoving(undefined)}
        >
          <p>
            “{removing.cafe.name}”{' '}
            {removing.save && holds(removing.save) ? `holds ${holds(removing.save)}` : `is ${FRESH}`}. Removing it
            deletes its progress, routines and settings from this browser, and no copy is kept. Export it first to keep
            it.
          </p>
          {removing.save && (
            <button
              className="settings-chip"
              onClick={() => {
                const file = saveFileName();
                download(JSON.stringify(removing.save, null, 2), file);
                sayExported(`“${removing.cafe.name}” exported as ${file}. Look for it with your downloads.`);
              }}
            >
              <Download size={15} aria-hidden="true" /> Export café
            </button>
          )}
          <p className="export-status" role="status">
            {exported}
          </p>
          <div className="modal-buttons">
            <button className="settings-chip" data-autofocus onClick={() => setRemoving(undefined)}>
              Keep café
            </button>
            <Button
              variant="danger"
              onClick={() => {
                const { cafe } = removing;
                setRemoving(undefined);
                if (!removeCafe(cafe.id)) return setError('This browser wouldn’t let the café go.');
                // After the slip hands focus back to a Remove button that's gone.
                focusNext.current = 'cafe-add';
                say(`Removed “${cafe.name}”.`);
              }}
            >
              Remove café
            </Button>
          </div>
        </Modal>
      )}
    </section>
  );
}
