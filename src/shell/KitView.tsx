import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowLeft, CircleCheck, CircleX, Undo2 } from 'lucide-react';
import { BlockLines, spokenLines } from '@/components';
import { titleFor } from '@/data';
import { drillLines, tryDrill } from '@/data/drills';
import { kitLines, type Kit } from '@/data/kits';
import { ROBOT_DISPLAY_NAMES, count } from '@/domain';

/** How many lines of the routine show on each side of the gap. */
const CONTEXT = 3;

/**
 * A limited kit: the routine around a gap, the blocks the kit has, and the passage built from them so far. Each block
 * goes in once, in the order picked, End included, and the last one can be taken back. Serving it runs the shift with
 * the built passage in the gap, so the verdict is the café's own; once served, the kit is done.
 */
export function KitView({ kit, onBack, onDone }: { kit: Kit; onBack: () => void; onDone: () => void }) {
  // The kit's blocks by where they sit in the tray, so two Ends stay two blocks.
  const [built, setBuilt] = useState<number[]>([]);
  const [verdict, setVerdict] = useState<{ served: boolean; reason?: string }>();
  const [said, setSaid] = useState('');
  const question = useRef<HTMLParagraphElement>(null);
  const tray = useRef<HTMLUListElement>(null);
  const serve = useRef<HTMLButtonElement>(null);
  useEffect(() => question.current?.focus(), []);

  const robot = ROBOT_DISPLAY_NAMES[kit.robot];
  const worked = drillLines(kit);
  const above = worked.before.slice(-CONTEXT),
    below = worked.after.slice(0, CONTEXT);
  const passage = built.map((at) => kit.tiles[at]);
  const placed = kitLines(kit, passage);
  const next = kitLines(kit, [...passage, 'GAP']).at(-1)!.depth;
  const base = Math.min(...[...above, ...placed, ...below].map((line) => line.depth), next);
  const left = kit.tiles.length - built.length;

  const change = (to: number[], words: string) => {
    setBuilt(to);
    setVerdict(undefined);
    setSaid(words);
  };
  const place = (at: number) => {
    if (built.includes(at)) return;
    const to = [...built, at];
    change(to, `${spokenLines([{ command: kit.tiles[at] }])} placed, ${to.length} of ${kit.tiles.length}.`);
    // The next block still in the kit takes focus, or Serve once the kit is empty.
    const after = kit.tiles.findIndex((_, i) => i > at && !to.includes(i));
    const first = kit.tiles.findIndex((_, i) => !to.includes(i));
    const target = after >= 0 ? after : first;
    requestAnimationFrame(() =>
      (target >= 0 ? tray.current?.querySelectorAll<HTMLElement>('button')[target] : serve.current)?.focus(),
    );
  };
  const takeBack = () =>
    built.length && change(built.slice(0, -1), `${spokenLines([{ command: kit.tiles[built.at(-1)!] }])} taken back.`);
  const serveIt = () => {
    if (!built.length) return;
    const result = tryDrill(kit, passage.join('\n'));
    if (result.passed) onDone();
    setVerdict({ served: result.passed, reason: result.first_failure?.reason });
    setSaid('');
  };

  return (
    <div className="drill kit">
      <button className="drill-back" onClick={onBack}>
        <ArrowLeft size={15} aria-hidden="true" /> All drills
      </button>
      <p className="drill-question" tabIndex={-1} ref={question}>
        {kit.question}
      </p>
      <p className="kit-rule">
        <strong>The kit</strong> {count(kit.tiles.length, 'block')}, each used once · <em>{kit.rule}</em>
      </p>
      <figure className="drill-routine">
        <figcaption>
          {robot}’s routine on Shift {kit.shift}, {titleFor(kit.shift - 1)}
        </figcaption>
        {worked.before.length > above.length && <span className="drill-more" aria-hidden="true" />}
        <BlockLines lines={above} base={base} />
        {placed.length > 0 && <BlockLines className="drill-filled" lines={placed} base={base} />}
        {left > 0 && (
          <span className="drill-gap" style={{ '--depth': next - base } as CSSProperties}>
            <span aria-hidden="true">?</span>
            <span className="sr-only">{placed.length ? 'The rest of the gap' : 'The gap'}</span>
          </span>
        )}
        <BlockLines lines={below} base={base} />
        {worked.after.length > below.length && <span className="drill-more" aria-hidden="true" />}
      </figure>
      <ul className="drill-choices kit-tray" aria-label="The kit" ref={tray}>
        {kit.tiles.map((tile, at) => (
          <li key={at}>
            <button
              className="drill-choice kit-tile"
              aria-disabled={built.includes(at) || undefined}
              aria-label={spokenLines([{ command: tile }])}
              onClick={() => place(at)}
            >
              <BlockLines lines={[{ command: tile, depth: 0 }]} />
            </button>
          </li>
        ))}
      </ul>
      <div className="kit-actions">
        {/* Greyed rather than disabled, so taking back the last block doesn't drop the focus. */}
        <button className="settings-chip" aria-disabled={!built.length || undefined} onClick={takeBack}>
          <Undo2 size={15} aria-hidden="true" /> Take back the last block
        </button>
        <button
          className="settings-chip kit-serve"
          ref={serve}
          aria-disabled={!built.length || undefined}
          onClick={serveIt}
        >
          Serve the shift
        </button>
      </div>
      <p className="sr-only" aria-live="polite">
        {said}
      </p>
      <div className={`drill-verdict ${verdict ? (verdict.served ? 'served' : 'turned') : ''}`} role="status">
        {verdict?.served ? (
          <>
            <CircleCheck size={18} aria-hidden="true" />
            <p>
              <strong>Served.</strong> {kit.idea}
            </p>
          </>
        ) : verdict ? (
          <>
            <CircleX size={18} aria-hidden="true" />
            <p>
              <strong>Not served.</strong> {verdict.reason} Take blocks back and try again.
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}
