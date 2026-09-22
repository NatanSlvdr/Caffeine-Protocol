import { useRef } from 'react';
import { ArrowRight, Check, LockKeyhole, Play, Star } from 'lucide-react';
import { levels, titleFor } from '@/data';
import { Cafe } from '@/components';
import { Button } from '@/shared/ui/Button';
import { go } from '@/shared/lib/navigation';
import { pad2, starRow } from '@/shared/lib/format';
import { useGame, useProgress } from '@/state/GameStore';

const chapters = [
  { title: 'First days', subtitle: 'Find your feet', from: 0, to: 2 },
  { title: 'The front counter', subtitle: 'Meet Query', from: 2, to: 14 },
  { title: 'Behind the counter', subtitle: 'Meet Brew', from: 14, to: 22 },
  { title: 'The café floor', subtitle: 'Meet Porter', from: 22, to: 30 },
  { title: 'Together at last', subtitle: 'The whole crew', from: 30, to: levels.length },
];

/** Chapter-based shift board and a preview of the selected shift. */
export function CampaignPage() {
  const { save, select, launch } = useGame();
  const progress = useProgress();
  const preview = useRef<HTMLElement>(null);
  const selected = levels[save.selected];
  const selectedChapter = chapters.find((chapter) => save.selected >= chapter.from && save.selected < chapter.to);

  const showShift = (index: number) => {
    select(index);
    if (window.innerWidth <= 950) {
      preview.current?.scrollIntoView({ behavior: save.settings.reduced_motion ? 'auto' : 'smooth', block: 'start' });
    }
  };

  return (
    <main className="campaign-page">
      <div className="campaign-heading">
        <div>
          <span className="eyebrow">THE SERVICE MANUAL / YOUR STORY SO FAR</span>
          <h1>Every shift tells a story.</h1>
          <p>Pick up where you left off, or revisit a favorite day at the café.</p>
        </div>
        <div className="campaign-progress" aria-label={`${progress.done} of ${progress.total} shifts complete`}>
          <span>
            YOUR JOURNEY{' '}
            <strong>
              {progress.done} <small>/ {progress.total}</small>
            </strong>
          </span>
          <div className="campaign-progress-track">
            <span style={{ width: `${(progress.done / progress.total) * 100}%` }} />
          </div>
          <small>SHIFTS COMPLETE</small>
        </div>
      </div>

      <div className="campaign-layout">
        <div className="chapter-list">
          {chapters.map((chapter, chapterIndex) => (
            <section className="chapter" key={chapter.title} aria-labelledby={`chapter-${chapterIndex}`}>
              <div className="chapter-heading">
                <span className="chapter-index">{pad2(chapterIndex + 1)}</span>
                <div>
                  <h2 id={`chapter-${chapterIndex}`}>{chapter.title}</h2>
                  <p>{chapter.subtitle}</p>
                </div>
                <span className="chapter-range">
                  SHIFTS {pad2(chapter.from + 1)}—{pad2(chapter.to)}
                </span>
              </div>
              <div className="shift-grid">
                {levels.slice(chapter.from, chapter.to).map((level, offset) => {
                  const index = chapter.from + offset;
                  const locked = index > save.unlocked;
                  const complete = save.stars[index] !== undefined;
                  return (
                    <button
                      key={level.id}
                      disabled={locked}
                      className={`shift-card ${save.selected === index ? 'selected' : ''} ${complete ? 'complete' : ''}`}
                      onClick={() => showShift(index)}
                      aria-label={`Shift ${index + 1}: ${titleFor(index)}${locked ? ', locked' : ''}`}
                      aria-pressed={!locked && save.selected === index}
                    >
                      <span className="card-number">
                        <span>SHIFT {pad2(index + 1)}</span>
                        {locked ? (
                          <LockKeyhole size={15} />
                        ) : complete ? (
                          <Check size={16} />
                        ) : (
                          <span className="tiny-dot" />
                        )}
                      </span>
                      <strong>{titleFor(index)}</strong>
                      <span className="card-bottom">
                        <span>
                          {locked
                            ? 'LOCKED'
                            : complete
                              ? 'COMPLETED'
                              : index === save.unlocked
                                ? 'UP NEXT'
                                : 'READY TO PLAY'}
                        </span>
                        {!locked && index >= 2 && (
                          <span aria-label={`${save.stars[index] ?? 0} stars`}>{starRow(save.stars[index] ?? 0)}</span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <aside ref={preview} className="campaign-preview" aria-label="Selected shift">
          <div className="preview-topline">
            <span className="status-dot" /> SELECTED SHIFT <span>↗</span>
          </div>
          <div className="preview-world">
            <Cafe
              level={save.selected + 1}
              evening={save.selected > 10}
              reduced={save.settings.reduced_motion}
              pixelArt={save.settings.pixel_art}
            />
          </div>
          <div className="preview-copy">
            <span className="eyebrow">
              {selectedChapter?.title.toUpperCase()} / SHIFT {pad2(save.selected + 1)}
            </span>
            <h2>{titleFor(save.selected)}</h2>
            <p>{selected.summary}</p>
            <div className="preview-metrics">
              <span>
                <Star size={14} />{' '}
                {save.stars[save.selected] === undefined
                  ? 'A new challenge'
                  : `${save.stars[save.selected]} stars earned`}
              </span>
              <span>
                {selected.active_tables} tables · {selected.seeds.length} test shifts
              </span>
            </div>
            <Button variant="primary" onClick={() => launch(save.selected)}>
              <Play size={16} fill="currentColor" /> Start shift <ArrowRight size={17} />
            </Button>
            {save.complete && (
              <Button variant="text-link" onClick={() => go('/ending')}>
                Revisit closing time <ArrowRight size={15} />
              </Button>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
