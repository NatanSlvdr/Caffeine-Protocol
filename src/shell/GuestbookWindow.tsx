import { Modal } from '@/shared/ui/Modal';
import { cast } from '@/data/campaign/cast';
import { guestbook, noteText, type GuestbookNote } from '@/data/campaign/guestbook';
import { pad2 } from '@/shared/lib/format';
import { useLanguage, useWords } from '@/shared/language';
import { useCafeName, useNarrative } from '@/state/GameStore';
import { KEPT_WORDS } from './keptWords';

/** The guestbook by the till: what the regulars wrote after the shifts they were part of, oldest first. */
export function GuestbookWindow({
  notes,
  fresh = [],
  onClose,
}: {
  notes: readonly GuestbookNote[];
  /** The notes, by shift, written since the book was last opened. */
  fresh?: readonly string[];
  onClose: () => void;
}) {
  const cafe = useCafeName();
  const say = useWords(KEPT_WORDS).guestbook;
  const [language] = useLanguage();
  const narrative = useNarrative();
  return (
    <Modal
      className="settings-window guestbook-window"
      kicker={say.kicker(cafe)}
      title={say.title}
      onClose={onClose}
      wide
    >
      <ol className="guestbook-notes">
        {notes.map((note) => {
          const name = cast[note.who].name;
          return (
            <li key={note.shift} className={fresh.includes(String(note.shift)) ? 'new' : undefined}>
              <figure>
                <blockquote>
                  <p>{noteText(note, language)}</p>
                </blockquote>
                <figcaption>
                  {fresh.includes(String(note.shift)) && <strong className="guestbook-new">{say.fresh}</strong>}
                  <cite>{note.sign}</cite>
                  <small>
                    {name === note.sign ? '' : `${name} · `}
                    {say.after(pad2(note.shift))}
                    {narrative[note.shift - 1].title}
                  </small>
                </figcaption>
              </figure>
            </li>
          );
        })}
      </ol>
      {notes.length < guestbook.length && <p className="guestbook-blank">{say.blank}</p>}
    </Modal>
  );
}
