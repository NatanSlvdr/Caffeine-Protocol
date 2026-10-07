import { Footprints } from 'lucide-react';
import { useUntranslated, useWords } from '@/shared/language';
import type { PreviewNote } from './blockPreview';
import { PREVIEW_WORDS } from './previewWords';

/**
 * The words beside the café's preview of the picked block: which block it is and each way it went in a dry run of the
 * first round, or why nothing is drawn. With no block picked that can be drawn, it says which can.
 */
export function BlockPreviewNote({ note, textMode }: { note?: PreviewNote; textMode: boolean }) {
  const words = useWords(PREVIEW_WORDS),
    english = useUntranslated();
  /** Why the run stopped, in the simulation's own English, after the sentence that leads into it. */
  const because = (reason?: string) =>
    reason && (
      <>
        {' '}
        <span lang={english}>{reason}</span>.
      </>
    );
  return (
    <section className="block-preview" aria-label={words.region}>
      <div aria-live="polite">
        {note ? (
          <>
            <h3>
              <Footprints size={14} aria-hidden="true" />
              {note.title}
              <span>{note.scope}</span>
            </h3>
            {note.empty ? (
              <p className="block-preview-empty">
                {note.empty}
                {because(note.reason)}
              </p>
            ) : (
              <ul>
                {note.ways.map((way, i) => (
                  <li key={i} className={i === 0 ? 'first' : undefined}>
                    {way.words}
                    {way.stop && (
                      <>
                        {' '}
                        {words.stops}
                        {because(way.stop)}
                      </>
                    )}
                    {way.times > 1 && <span className="block-preview-times"> · {words.times(way.times)}</span>}
                  </li>
                ))}
                {note.more > 0 && <li className="block-preview-more">{words.more(note.more)}</li>}
              </ul>
            )}
          </>
        ) : (
          <p className="block-preview-empty">
            <Footprints size={14} aria-hidden="true" />
            {words.pick(textMode)}
          </p>
        )}
      </div>
    </section>
  );
}
