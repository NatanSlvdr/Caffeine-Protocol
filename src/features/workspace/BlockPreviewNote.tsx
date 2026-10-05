import { Footprints } from 'lucide-react';
import { count } from '@/domain';
import type { PreviewNote } from './blockPreview';

/**
 * The words beside the café's preview of the picked block: which block it is and each way it went in a dry run of the
 * first round, or why nothing is drawn. With no block picked that can be drawn, it says which can.
 */
export function BlockPreviewNote({ note, textMode }: { note?: PreviewNote; textMode: boolean }) {
  return (
    <section className="block-preview" aria-label="The picked block in the café">
      <div aria-live="polite">
        {note ? (
          <>
            <h3>
              <Footprints size={14} aria-hidden="true" />
              {note.title}
              <span>{note.scope}</span>
            </h3>
            {note.empty ? (
              <p className="block-preview-empty">{note.empty}</p>
            ) : (
              <ul>
                {note.ways.map((way, i) => (
                  <li key={i} className={i === 0 ? 'first' : undefined}>
                    {way.words}
                    {way.times > 1 && (
                      <span className="block-preview-times"> · {way.times === 2 ? 'twice' : `${way.times} times`}</span>
                    )}
                  </li>
                ))}
                {note.more > 0 && <li className="block-preview-more">And {count(note.more, 'other way')}.</li>}
              </ul>
            )}
          </>
        ) : (
          <p className="block-preview-empty">
            <Footprints size={14} aria-hidden="true" />
            Pick a Move, Take, Deposit or Use {textMode ? 'line' : 'block'} to see where it goes in the café.
          </p>
        )}
      </div>
    </section>
  );
}
