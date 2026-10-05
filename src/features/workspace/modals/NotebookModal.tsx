import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { BookmarkPlus, Download, Upload } from 'lucide-react';
import { unreadableLine, type RobotRole } from '@/domain';
import { ROBOT_DISPLAY_NAMES } from '@/domain/robots';
import { Modal } from '@/components';
import { Button } from '@/shared/ui/Button';
import { download, saveFileName } from '@/shared/lib/download';
import { RUN_MODIFIER, pad2 } from '@/shared/lib/format';
import { useAnnouncement } from '@/hooks/useAnnouncement';
import { sameRoutine } from '../versions';
import {
  MAX_PAGES,
  NAME_MAX,
  findPage,
  freeName,
  keepPage,
  mergePages,
  notebookFile,
  pageBlocks,
  parseNotebook,
  readNotebook,
  removePage,
  writeNotebook,
  type NotebookPage,
} from '../notebook';
import { RoutineDiff } from './RoutineDiff';

export interface NotebookModalProps {
  /** The open robot, whose routine is kept and whose routine a page goes into. */
  role: RobotRole;
  /** The shift on screen: a page is read with its library of blocks. */
  shift: number;
  current: string;
  running: boolean;
  /** Puts a page in place of the open routine. */
  onUse: (page: NotebookPage) => void;
  /** Puts a page after the open routine's last line. */
  onAdd: (page: NotebookPage) => void;
  onClose: () => void;
}

const count = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/**
 * The routine notebook: the open robot's routine kept under a name, and kept pages brought back on any shift, in
 * place of the routine or after it. Each page says whether the open robot can read it on this shift, since a page can
 * come from another robot or from a shift whose blocks this one doesn't have yet. The notebook stays in this browser,
 * and travels as a file.
 */
export function NotebookModal({ role, shift, current, running, onUse, onAdd, onClose }: NotebookModalProps) {
  const robot = ROBOT_DISPLAY_NAMES[role];
  const suggested = `${robot}, Shift ${pad2(shift)}`;
  const [pages, setPages] = useState(readNotebook);
  const [kept, setKept] = useState(true);
  const [chosen, setChosen] = useState(() => pages[0]?.name);
  const [name, setName] = useState(() => freeName(pages, suggested));
  // The page just removed, and where it was, until something else happens: it can go back.
  const [removed, setRemoved] = useState<{ page: NotebookPage; at: number }>();
  // What happened to the pages, said under them; what came of an export or import, said under its buttons.
  const [said, say] = useAnnouncement();
  const [carried, sayCarried] = useAnnouncement();
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null),
    putBackButton = useRef<HTMLButtonElement>(null);
  // The last page takes its buttons with it: focus carries on at the way back.
  useEffect(() => {
    if (removed && !pages.length) putBackButton.current?.focus();
  }, [removed]);

  const commit = (next: NotebookPage[]) => {
    setPages(next);
    setKept(writeNotebook(next));
    setRemoved(undefined);
    setError('');
  };
  const page = chosen === undefined ? undefined : findPage(pages, chosen);
  const unfit = (p: NotebookPage) => unreadableLine(p.source, role, shift);

  const blocks = pageBlocks(current);
  const replacing = findPage(pages, name);
  const twin = pages.find((p) => p.role === role && sameRoutine(p.source, current));
  const keepNote = !blocks
    ? `${robot}’s routine is empty: there’s nothing to keep yet.`
    : !replacing && pages.length >= MAX_PAGES
      ? `The notebook is full at ${MAX_PAGES} pages: remove one to make room.`
      : twin && (!replacing || twin !== replacing)
        ? `Already kept as “${twin.name}”.`
        : '';
  const keep = (e: FormEvent) => {
    e.preventDefault();
    const named = name.trim();
    if (!named || !blocks || (!replacing && pages.length >= MAX_PAGES)) return;
    const next = keepPage(pages, { name: named, role, shift, source: current });
    commit(next);
    setChosen(named);
    setName(freeName(next, suggested));
    say(replacing ? `Replaced “${replacing.name}” with ${robot}’s routine.` : `Kept ${robot}’s routine as “${named}”.`);
  };
  const remove = (gone: NotebookPage) => {
    const at = pages.indexOf(gone);
    const next = removePage(pages, gone.name);
    commit(next);
    setRemoved({ page: gone, at });
    setChosen(next[Math.min(at, next.length - 1)]?.name);
    say(`Removed “${gone.name}”.`);
  };
  const putBack = ({ page: back, at }: { page: NotebookPage; at: number }) => {
    commit([...pages.slice(0, at), back, ...pages.slice(at)]);
    setChosen(back.name);
    say(`“${back.name}” is back in the notebook.`);
  };

  const misfit = page && unfit(page);
  const same = !!page && sameRoutine(page.source, current);
  const blocked = running ? `Stop the service to change ${robot}’s routine.` : '';
  return (
    <Modal
      className="settings-window confirm-slip restore-slip notebook-slip"
      kicker="Kept in this browser"
      title="Routine notebook"
      onClose={onClose}
    >
      <form className="notebook-keep" onSubmit={keep}>
        <label htmlFor="notebook-name">Keep {robot}’s routine as</label>
        <div>
          <input
            id="notebook-name"
            type="text"
            value={name}
            maxLength={NAME_MAX}
            autoComplete="off"
            spellCheck={false}
            aria-describedby={keepNote ? 'notebook-keep-note' : undefined}
            data-autofocus
            onFocus={(e) => e.target.select()}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            type="submit"
            className="settings-chip"
            disabled={!name.trim() || !blocks || (!replacing && pages.length >= MAX_PAGES)}
          >
            <BookmarkPlus size={15} aria-hidden="true" /> {replacing ? 'Replace page' : 'Keep page'}
          </button>
        </div>
        {keepNote && <small id="notebook-keep-note">{keepNote}</small>}
      </form>

      {pages.length === 0 ? (
        <p className="notebook-empty">
          No pages yet. Keep a routine that works, or a part worth reusing, and bring it back on any shift.
        </p>
      ) : (
        <fieldset className="restore-versions notebook-pages">
          <legend className="sr-only">Notebook pages</legend>
          {pages.map((p) => {
            const problem = unfit(p);
            return (
              <label key={p.name} className="restore-version">
                <input
                  type="radio"
                  name="notebook-page"
                  checked={chosen === p.name}
                  onChange={() => setChosen(p.name)}
                />
                <span>
                  <strong>{p.name}</strong>
                  <small>
                    {ROBOT_DISPLAY_NAMES[p.role]} · Shift {pad2(p.shift)} · {count(pageBlocks(p.source), 'block')}
                  </small>
                  {problem && <small className="notebook-unfit">{problem.message}</small>}
                </span>
              </label>
            );
          })}
        </fieldset>
      )}

      <div className="notebook-status">
        <p role="status">{said}</p>
        {removed && (
          <button ref={putBackButton} className="settings-chip notebook-put-back" onClick={() => putBack(removed)}>
            Put it back
          </button>
        )}
      </div>

      {page && (
        <>
          {!same && <RoutineDiff robot={robot} current={current} next={page.source} brings="in" />}
          <p>
            Use puts the page in place of {robot}’s routine; Add to the end puts it after the last line. Undo (
            {RUN_MODIFIER} Z) brings yours back.
          </p>
          {blocked && <p id="notebook-blocked">{blocked}</p>}
          <div className="modal-buttons notebook-actions">
            <Button variant="outline-danger" className="settings-chip" onClick={() => remove(page)}>
              Remove page
            </Button>
            <button
              className="settings-chip"
              disabled={running || !!misfit}
              aria-describedby={blocked ? 'notebook-blocked' : undefined}
              onClick={() => onAdd(page)}
            >
              Add to the end
            </button>
            <Button
              variant="primary"
              disabled={running || !!misfit || same}
              aria-describedby={blocked ? 'notebook-blocked' : undefined}
              onClick={() => onUse(page)}
            >
              {same ? `Same as ${robot}’s now` : 'Use this page'}
            </Button>
          </div>
        </>
      )}

      <section className="options-report notebook-carry" aria-labelledby="notebook-carry-title">
        <h3 id="notebook-carry-title">Carry it to another browser</h3>
        <p>
          Export the notebook as a file to keep a copy, or to bring it to another computer. Importing one adds its pages
          to these.
        </p>
        <div className="settings-actions">
          <button
            className="settings-chip"
            disabled={!pages.length}
            onClick={() => {
              const file = saveFileName(new Date(), 'notebook');
              download(notebookFile(pages), file);
              setError('');
              sayCarried(`Notebook exported as ${file}. Look for it with your downloads.`);
            }}
          >
            <Download size={15} aria-hidden="true" /> Export notebook
          </button>
          <button className="settings-chip" onClick={() => input.current?.click()}>
            <Upload size={15} aria-hidden="true" /> Import notebook
          </button>
        </div>
        <input
          ref={input}
          aria-label="Import notebook file"
          className="file-input"
          type="file"
          accept="application/json,.json"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file) return;
            try {
              if (file.size > 2_000_000) throw new Error('It is too large to be a routine notebook.');
              const read = parseNotebook(await file.text());
              const merged = mergePages(pages, read.pages);
              commit(merged.pages);
              if (merged.added) setChosen(merged.pages[pages.length].name);
              sayCarried(
                [
                  merged.added
                    ? `Added ${count(merged.added, 'page')} from ${file.name}.`
                    : `Nothing new in ${file.name}.`,
                  merged.already && `${count(merged.already, 'page')} already here.`,
                  merged.full && `${count(merged.full, 'page')} left out: the notebook is full.`,
                  read.damaged && `${count(read.damaged, 'damaged page')} couldn’t be read.`,
                ]
                  .filter(Boolean)
                  .join(' '),
              );
            } catch (err) {
              sayCarried('');
              setError(`${file.name} wasn’t imported. ${(err as Error).message} Your notebook has been kept.`);
            }
          }}
        />
        <p className="settings-status" role="status">
          {carried}
        </p>
        {error && (
          <p role="alert" className="error-text">
            {error}
          </p>
        )}
        {!kept && (
          <p role="alert" className="error-text">
            This browser isn’t keeping the notebook, so it lasts until the café closes. Export it to keep it.
          </p>
        )}
      </section>
    </Modal>
  );
}
