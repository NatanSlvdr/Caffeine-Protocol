import { useEffect, useMemo, useRef } from 'react';
import { ArrowLeft, Download, Plus, X } from 'lucide-react';
import { ROBOT_DISPLAY_NAMES } from '@/domain/robots';
import { Button } from '@/shared/ui/Button';
import { download } from '@/shared/lib/download';
import { pad2 } from '@/shared/lib/format';
import { useAnnouncement } from '@/hooks/useAnnouncement';
import {
  NOTE_MAX,
  lessonFileName,
  lessonText,
  pageLines,
  readableFrom,
  type BlockNote,
  type NotebookPage,
} from '../notebook';

export interface LessonEditorProps {
  page: NotebookPage;
  /** The page's lesson as written so far, kept as it changes. */
  onChange: (lesson: { about?: string; notes: BlockNote[] }) => void;
  onBack: () => void;
}

/**
 * A notebook page written up as a lesson: a word on what it shows, and a note on each block worth one, numbered in
 * the routine's order. Everything is plain text, and the lesson goes out as a text file to read beside the café.
 */
export function LessonEditor({ page, onChange, onBack }: LessonEditorProps) {
  const robot = ROBOT_DISPLAY_NAMES[page.role];
  const from = useMemo(() => readableFrom(page), [page.source, page.role]);
  const lines = pageLines(page.source);
  const notes = page.notes ?? [];
  const [said, say] = useAnnouncement();
  const about = useRef<HTMLTextAreaElement>(null);
  // Where focus goes once the change it follows is on screen: a new note's field, or the block a note left.
  const focusNext = useRef('');
  useEffect(() => about.current?.focus(), []);
  useEffect(() => {
    if (!focusNext.current) return;
    document.getElementById(focusNext.current)?.focus();
    focusNext.current = '';
  });

  const setNotes = (next: BlockNote[]) =>
    onChange({ about: page.about, notes: [...next].sort((a, b) => a.block - b.block) });
  const noteOn = (block: number) => notes.find((note) => note.block === block);
  const lineOf = (block: number) => lines[block].line + 1;
  const add = (block: number) => {
    focusNext.current = `lesson-note-${block}`;
    if (noteOn(block)) return document.getElementById(focusNext.current)?.focus();
    setNotes([...notes, { block, text: '' }]);
    say(`Note added on line ${lineOf(block)}.`);
  };
  const remove = (block: number) => {
    focusNext.current = `lesson-block-${block}`;
    setNotes(notes.filter((note) => note.block !== block));
    say(`Note on line ${lineOf(block)} removed.`);
  };

  return (
    <div className="lesson">
      <button type="button" className="settings-chip lesson-back" onClick={onBack}>
        <ArrowLeft size={15} aria-hidden="true" /> Back to the notebook
      </button>
      <h3 className="lesson-title">Lesson · {page.name}</h3>
      <p className="lesson-meta">
        {robot} · kept on Shift {pad2(page.shift)} ·{' '}
        {from ? `${robot} reads it from Shift ${pad2(from)} on` : `${robot} can’t read it on any shift`}
      </p>

      <label className="lesson-label" htmlFor="lesson-about">
        What it shows
      </label>
      <textarea
        ref={about}
        id="lesson-about"
        rows={2}
        maxLength={NOTE_MAX}
        value={page.about ?? ''}
        placeholder="A sentence or two to open the lesson"
        onChange={(e) => onChange({ about: e.target.value, notes })}
      />

      <p className="lesson-label" id="lesson-blocks-label">
        Notes on blocks
      </p>
      <p className="lesson-hint">
        Pick a block to say a word on it. The lesson walks through the notes in the routine’s order.
      </p>
      {lines.length ? (
        <ol className="lesson-blocks" aria-labelledby="lesson-blocks-label">
          {lines.map(({ line, text }, block) => {
            const note = noteOn(block);
            const step = note ? notes.indexOf(note) + 1 : 0;
            return (
              <li key={line} className={note ? 'noted' : undefined}>
                <button
                  id={`lesson-block-${block}`}
                  type="button"
                  className="lesson-block"
                  aria-label={`Line ${line + 1}: ${text.trim()}, ${note ? `note ${step}` : 'add a note'}`}
                  onClick={() => add(block)}
                >
                  <span className="lesson-line" aria-hidden="true">
                    {line + 1}
                  </span>
                  <code aria-hidden="true">{text}</code>
                  <span className="lesson-step" aria-hidden="true">
                    {step || <Plus size={13} />}
                  </span>
                </button>
                {note && (
                  <div className="lesson-note">
                    <input
                      id={`lesson-note-${block}`}
                      type="text"
                      maxLength={NOTE_MAX}
                      autoComplete="off"
                      value={note.text}
                      placeholder="What this block does here"
                      aria-label={`Note ${step}, on line ${line + 1}`}
                      onChange={(e) => setNotes(notes.map((n) => (n === note ? { block, text: e.target.value } : n)))}
                    />
                    <button
                      type="button"
                      className="lesson-remove"
                      aria-label={`Remove note ${step}`}
                      onClick={() => remove(block)}
                    >
                      <X size={15} aria-hidden="true" />
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="notebook-empty">This page has no blocks to note.</p>
      )}

      <p className="lesson-status" role="status">
        {said}
      </p>
      <div className="modal-buttons lesson-actions">
        <small>Kept as you write. The lesson goes out as plain text, with nothing in it that runs.</small>
        <Button
          variant="primary"
          onClick={() => {
            const file = lessonFileName(page.name);
            download(lessonText(page), file, 'text/plain');
            say(`Lesson exported as ${file}. Look for it with your downloads.`);
          }}
        >
          <Download size={15} aria-hidden="true" /> Export lesson
        </Button>
      </div>
    </div>
  );
}
