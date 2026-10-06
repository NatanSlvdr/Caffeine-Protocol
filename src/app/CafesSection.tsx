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
import { useWords } from '@/shared/language';
import { CAFE_WORDS } from './cafeWords';

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
  const words = useWords(CAFE_WORDS);
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
    return (kept && words.holds(kept)) || words.nothingServed;
  };
  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!cleanCafeName(name)) return;
    if (!addCafe(name)) setError(words.noRoom);
  };
  const rename = (e: FormEvent, cafe: CafeEntry) => {
    e.preventDefault();
    if (!cleanCafeName(label)) return;
    if (!renameCafe(cafe.id, label)) return setError(words.noRename);
    setRenaming(undefined);
    focusNext.current = `cafe-rename-${cafe.id}`;
    say(words.renamed(cafe.name));
  };

  return (
    <section className="settings-block cafes-block">
      <h3>
        <Store size={16} aria-hidden="true" /> {words.heading}
      </h3>
      <p>{words.intro}</p>
      <ul className="cafe-list" aria-label={words.list}>
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
                    aria-label={words.newName(cafe.name)}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setLabel(e.target.value)}
                  />
                  <button type="submit" className="settings-chip" disabled={!cleanCafeName(label)}>
                    {words.save}
                  </button>
                  <button
                    type="button"
                    className="settings-chip"
                    onClick={() => {
                      setRenaming(undefined);
                      focusNext.current = `cafe-rename-${cafe.id}`;
                    }}
                  >
                    {words.cancel}
                  </button>
                </form>
              ) : (
                <>
                  <span className="cafe-name">
                    <strong>{cafe.name}</strong>
                    <small>
                      {open && <span className="cafe-open">{words.openNow}</span>}
                      {summary(cafe)}
                    </small>
                  </span>
                  <span className="cafe-buttons">
                    {!open && (
                      <button
                        className="settings-chip"
                        aria-label={words.openNamed(cafe.name)}
                        onClick={() => openCafe(cafe.id)}
                      >
                        {words.open}
                      </button>
                    )}
                    <button
                      id={`cafe-rename-${cafe.id}`}
                      className="settings-chip"
                      aria-label={words.renameNamed(cafe.name)}
                      onClick={() => {
                        setRenaming(cafe.id);
                        setLabel(cafe.name);
                        setError('');
                        focusNext.current = 'cafe-label';
                      }}
                    >
                      {words.rename}
                    </button>
                    {!open && (
                      <Button
                        variant="outline-danger"
                        className="settings-chip"
                        aria-label={words.removeNamed(cafe.name)}
                        aria-haspopup="dialog"
                        onClick={() => {
                          setError('');
                          sayExported('');
                          setRemoving({ cafe, save: keptSave(cafe.id) });
                        }}
                      >
                        {words.remove}
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
          <label htmlFor="cafe-new-name">{words.nameNew}</label>
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
              {words.openIt}
            </button>
            <button
              type="button"
              className="settings-chip"
              onClick={() => {
                setAdding(false);
                focusNext.current = 'cafe-add';
              }}
            >
              {words.cancel}
            </button>
          </div>
          <small id="cafe-new-note">{words.newNote}</small>
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
            <Plus size={15} aria-hidden="true" /> {words.add}
          </button>
          <Button variant="outline-danger" className="settings-chip" aria-haspopup="dialog" onClick={onStartOver}>
            {words.startOver}
          </Button>
        </div>
      )}
      {full && <small id="cafe-full">{words.full}</small>}
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
          kicker={words.heading}
          title={words.removeTitle}
          onClose={() => setRemoving(undefined)}
        >
          <p>
            {words.removeBody(removing.cafe.name, words.holdsOrFresh(removing.save ? words.holds(removing.save) : ''))}
          </p>
          {removing.save && (
            <button
              className="settings-chip"
              onClick={() => {
                const file = saveFileName();
                download(JSON.stringify(removing.save, null, 2), file);
                sayExported(words.exportedNamed(removing.cafe.name, file));
              }}
            >
              <Download size={15} aria-hidden="true" /> {words.exportCafe}
            </button>
          )}
          <p className="export-status" role="status">
            {exported}
          </p>
          <div className="modal-buttons">
            <button className="settings-chip" data-autofocus onClick={() => setRemoving(undefined)}>
              {words.keep}
            </button>
            <Button
              variant="danger"
              onClick={() => {
                const { cafe } = removing;
                setRemoving(undefined);
                if (!removeCafe(cafe.id)) return setError(words.noRemove);
                // After the slip hands focus back to a Remove button that's gone.
                focusNext.current = 'cafe-add';
                say(words.removed(cafe.name));
              }}
            >
              {words.removeCafe}
            </Button>
          </div>
        </Modal>
      )}
    </section>
  );
}
