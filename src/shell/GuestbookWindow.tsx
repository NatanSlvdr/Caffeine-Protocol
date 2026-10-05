import { Modal } from '@/components';
import { titleFor } from '@/data';
import { cast } from '@/data/campaign/cast';
import { guestbook, type GuestbookNote } from '@/data/campaign/guestbook';
import { pad2 } from '@/shared/lib/format';
import { useCafeName } from '@/state/GameStore';

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
  return (
    <Modal
      className="settings-window guestbook-window"
      kicker={`${cafe} · Guestbook`}
      title="Left by the till."
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
                  <p>{note.text}</p>
                </blockquote>
                <figcaption>
                  {fresh.includes(String(note.shift)) && <strong className="guestbook-new">New</strong>}
                  <cite>{note.sign}</cite>
                  <small>
                    {name === note.sign ? '' : `${name} · `}After Shift {pad2(note.shift)}, {titleFor(note.shift - 1)}
                  </small>
                </figcaption>
              </figure>
            </li>
          );
        })}
      </ol>
      {notes.length < guestbook.length && <p className="guestbook-blank">The rest of the book is still blank.</p>}
    </Modal>
  );
}
