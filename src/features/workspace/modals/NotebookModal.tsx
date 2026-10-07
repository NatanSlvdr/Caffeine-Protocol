import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { BookmarkPlus, Download, PencilLine, Upload } from 'lucide-react';
import { unreadableLine, type RobotRole } from '@/domain';
import { ROBOT_DISPLAY_NAMES } from '@/domain/robots';
import { Modal } from '@/components';
import { Button } from '@/shared/ui/Button';
import { download, saveFileName } from '@/shared/lib/download';
import { RUN_MODIFIER, pad2 } from '@/shared/lib/format';
import { useAnnouncement } from '@/hooks/useAnnouncement';
import { useUntranslated, useWords } from '@/shared/language';
import { sameRoutine } from '../versions';
import {
  MAX_PAGES,
  NAME_MAX,
  carryNotes,
  findPage,
  freeName,
  hasLesson,
  keepPage,
  mergePages,
  notebookFile,
  pageBlocks,
  parseNotebook,
  readNotebook,
  removePage,
  writeNotebook,
  NotebookRefusal,
  type NotebookPage,
} from '../notebook';
import { RoutineDiff } from './RoutineDiff';
import { LessonEditor } from './LessonEditor';
import { NOTEBOOK_WORDS } from './notebookWords';

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

/** How many notes a page's lesson has, or nothing when it has no lesson. */
const lessonNotes = (page: NotebookPage) =>
  hasLesson(page) ? (page.notes ?? []).filter((note) => note.text.trim()).length : undefined;

/**
 * The routine notebook: the open robot's routine kept under a name, and kept pages brought back on any shift, in
 * place of the routine or after it. Each page says whether the open robot can read it on this shift, since a page can
 * come from another robot or from a shift whose blocks this one doesn't have yet. The notebook stays in this browser,
 * and travels as a file.
 */
export function NotebookModal({ role, shift, current, running, onUse, onAdd, onClose }: NotebookModalProps) {
  const words = useWords(NOTEBOOK_WORDS);
  const english = useUntranslated();
  const robot = ROBOT_DISPLAY_NAMES[role];
  const suggested = words.suggested(robot, pad2(shift));
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
  // The page being written up as a lesson, which takes the notebook's place until the way back.
  const [writing, setWriting] = useState<string>();
  const input = useRef<HTMLInputElement>(null),
    putBackButton = useRef<HTMLButtonElement>(null),
    lessonButton = useRef<HTMLButtonElement>(null),
    wrote = useRef(false);
  // The last page takes its buttons with it: focus carries on at the way back.
  useEffect(() => {
    if (removed && !pages.length) putBackButton.current?.focus();
  }, [removed]);
  // Back from a lesson, focus is where it was left: on the button that opened it.
  useEffect(() => {
    if (writing) wrote.current = true;
    else if (wrote.current) {
      wrote.current = false;
      lessonButton.current?.focus();
    }
  }, [writing]);

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
    ? words.nothingToKeep(robot)
    : !replacing && pages.length >= MAX_PAGES
      ? words.full(MAX_PAGES)
      : twin && (!replacing || twin !== replacing)
        ? words.already(twin.name)
        : '';
  const keep = (e: FormEvent) => {
    e.preventDefault();
    const named = name.trim();
    if (!named || !blocks || (!replacing && pages.length >= MAX_PAGES)) return;
    // A page kept in another's place keeps its lesson, each note following its block into the new routine.
    const notes = replacing ? carryNotes(replacing, current) : [];
    const lost = (replacing?.notes ?? []).filter((note) => note.text.trim()).length - notes.length;
    const lesson = replacing && hasLesson(replacing) && { about: replacing.about, notes };
    const next = keepPage(pages, { name: named, role, shift, source: current, ...lesson });
    commit(next);
    setChosen(named);
    setName(freeName(next, suggested));
    say(
      !replacing
        ? words.kept(robot, named)
        : words.replaced(replacing.name, robot, !lesson ? 'none' : lost > 0 ? lost : 'whole'),
    );
  };
  const remove = (gone: NotebookPage) => {
    const at = pages.indexOf(gone);
    const next = removePage(pages, gone.name);
    commit(next);
    setRemoved({ page: gone, at });
    setChosen(next[Math.min(at, next.length - 1)]?.name);
    say(words.removed(gone.name));
  };
  const putBack = ({ page: back, at }: { page: NotebookPage; at: number }) => {
    commit([...pages.slice(0, at), back, ...pages.slice(at)]);
    setChosen(back.name);
    say(words.back(back.name));
  };

  const lessonPage = writing === undefined ? undefined : findPage(pages, writing);
  if (lessonPage)
    return (
      <Modal
        className="settings-window confirm-slip restore-slip notebook-slip"
        kicker={words.kicker}
        title={words.title}
        onClose={onClose}
      >
        <LessonEditor
          page={lessonPage}
          onChange={(lesson) => {
            commit(pages.map((p) => (p === lessonPage ? { ...p, ...lesson } : p)));
          }}
          onBack={() => setWriting(undefined)}
        />
        {!kept && (
          <p role="alert" className="error-text">
            {words.notKept}
          </p>
        )}
      </Modal>
    );

  const misfit = page && unfit(page);
  const same = !!page && sameRoutine(page.source, current);
  const blocked = running ? words.blocked(robot) : '';
  return (
    <Modal
      className="settings-window confirm-slip restore-slip notebook-slip"
      kicker={words.kicker}
      title={words.title}
      onClose={onClose}
    >
      <form className="notebook-keep" onSubmit={keep}>
        <label htmlFor="notebook-name">{words.keepAs(robot)}</label>
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
            <BookmarkPlus size={15} aria-hidden="true" /> {replacing ? words.replace : words.keep}
          </button>
        </div>
        {keepNote && <small id="notebook-keep-note">{keepNote}</small>}
      </form>

      {pages.length === 0 ? (
        <p className="notebook-empty">{words.empty}</p>
      ) : (
        <fieldset className="restore-versions notebook-pages">
          <legend className="sr-only">{words.pages}</legend>
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
                    {words.page(ROBOT_DISPLAY_NAMES[p.role], pad2(p.shift), pageBlocks(p.source), lessonNotes(p))}
                  </small>
                  {problem && (
                    <small className="notebook-unfit" lang={english}>
                      {problem.message}
                    </small>
                  )}
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
            {words.putBack}
          </button>
        )}
      </div>

      {page && (
        <>
          {!same && <RoutineDiff robot={robot} current={current} next={page.source} brings="in" />}
          <p>{words.how(robot, RUN_MODIFIER)}</p>
          {blocked && <p id="notebook-blocked">{blocked}</p>}
          <div className="modal-buttons notebook-actions">
            <Button variant="outline-danger" className="settings-chip" onClick={() => remove(page)}>
              {words.remove}
            </Button>
            <button ref={lessonButton} className="settings-chip" onClick={() => setWriting(page.name)}>
              <PencilLine size={15} aria-hidden="true" /> {hasLesson(page) ? words.editLesson : words.writeLesson}
            </button>
            <button
              className="settings-chip"
              disabled={running || !!misfit}
              aria-describedby={blocked ? 'notebook-blocked' : undefined}
              onClick={() => onAdd(page)}
            >
              {words.addToEnd}
            </button>
            <Button
              variant="primary"
              disabled={running || !!misfit || same}
              aria-describedby={blocked ? 'notebook-blocked' : undefined}
              onClick={() => onUse(page)}
            >
              {same ? words.same(robot) : words.use}
            </Button>
          </div>
        </>
      )}

      <section className="options-report notebook-carry" aria-labelledby="notebook-carry-title">
        <h3 id="notebook-carry-title">{words.carry}</h3>
        <p>{words.carryText}</p>
        <div className="settings-actions">
          <button
            className="settings-chip"
            disabled={!pages.length}
            onClick={() => {
              const file = saveFileName(new Date(), 'notebook');
              download(notebookFile(pages), file);
              setError('');
              sayCarried(words.exported(file));
            }}
          >
            <Download size={15} aria-hidden="true" /> {words.export}
          </button>
          <button className="settings-chip" onClick={() => input.current?.click()}>
            <Upload size={15} aria-hidden="true" /> {words.import}
          </button>
        </div>
        <input
          ref={input}
          aria-label={words.importFile}
          className="file-input"
          type="file"
          accept="application/json,.json"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file) return;
            try {
              if (file.size > 2_000_000) throw new NotebookRefusal('large');
              const read = parseNotebook(await file.text());
              const merged = mergePages(pages, read.pages);
              commit(merged.pages);
              if (merged.added) setChosen(merged.pages[pages.length].name);
              sayCarried(
                [
                  merged.added ? words.added(merged.added, file.name) : words.nothingNew(file.name),
                  merged.already && words.here(merged.already),
                  merged.full && words.leftOut(merged.full),
                  read.damaged && words.damaged(read.damaged),
                ]
                  .filter(Boolean)
                  .join(' '),
              );
            } catch (err) {
              sayCarried('');
              const why = err instanceof NotebookRefusal ? words.refused[err.why] : (err as Error).message;
              setError(words.notImported(file.name, why));
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
            {words.notKept}
          </p>
        )}
      </section>
    </Modal>
  );
}
