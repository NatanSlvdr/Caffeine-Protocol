import { useEffect, useMemo, useRef } from 'react';
import { ArrowLeft, Download, Plus, X } from 'lucide-react';
import { ROBOT_DISPLAY_NAMES } from '@/domain/robots';
import { Button } from '@/shared/ui/Button';
import { download } from '@/shared/lib/download';
import { pad2 } from '@/shared/lib/format';
import { useAnnouncement } from '@/hooks/useAnnouncement';
import { useWords } from '@/shared/language';
import {
  NOTE_MAX,
  lessonFileName,
  lessonText,
  pageLines,
  readableFrom,
  type BlockNote,
  type NotebookPage,
} from '../notebook';
import { NOTEBOOK_WORDS } from './notebookWords';

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
  const all = useWords(NOTEBOOK_WORDS);
  const words = all.lesson;
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
    say(words.noted(lineOf(block)));
  };
  const remove = (block: number) => {
    focusNext.current = `lesson-block-${block}`;
    setNotes(notes.filter((note) => note.block !== block));
    say(words.unnoted(lineOf(block)));
  };

  return (
    <div className="lesson">
      <button type="button" className="settings-chip lesson-back" onClick={onBack}>
        <ArrowLeft size={15} aria-hidden="true" /> {words.back}
      </button>
      <h3 className="lesson-title">{words.title(page.name)}</h3>
      <p className="lesson-meta">{words.meta(robot, pad2(page.shift), from ? pad2(from) : undefined)}</p>

      <label className="lesson-label" htmlFor="lesson-about">
        {words.about}
      </label>
      <textarea
        ref={about}
        id="lesson-about"
        rows={2}
        maxLength={NOTE_MAX}
        value={page.about ?? ''}
        placeholder={words.aboutHint}
        onChange={(e) => onChange({ about: e.target.value, notes })}
      />

      <p className="lesson-label" id="lesson-blocks-label">
        {words.notes}
      </p>
      <p className="lesson-hint">{words.notesHint}</p>
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
                  aria-label={words.block(line + 1, text.trim(), step)}
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
                      placeholder={words.noteHint}
                      aria-label={words.note(step, line + 1)}
                      onChange={(e) => setNotes(notes.map((n) => (n === note ? { block, text: e.target.value } : n)))}
                    />
                    <button
                      type="button"
                      className="lesson-remove"
                      aria-label={words.removeNote(step)}
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
        <p className="notebook-empty">{words.noBlocks}</p>
      )}

      <p className="lesson-status" role="status">
        {said}
      </p>
      <div className="modal-buttons lesson-actions">
        <small>{words.kept}</small>
        <Button
          variant="primary"
          onClick={() => {
            const file = lessonFileName(page.name);
            download(lessonText(page, all.file), file, 'text/plain');
            say(words.exported(file));
          }}
        >
          <Download size={15} aria-hidden="true" /> {words.export}
        </Button>
      </div>
    </div>
  );
}
