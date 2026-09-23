import { ArrowRight, Check, LockKeyhole, Play } from 'lucide-react';
import { levels, titleFor } from '@/data';
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

/** Full-width chapter list for selecting and starting a campaign shift. */
export function CampaignPage() {
  const { save, select, launch } = useGame();
  const progress = useProgress();

  return (
    <main className="campaign-page">
      <div className="campaign-heading">
        <div>
          <span className="eyebrow">CAFFEINE PROTOCOL</span>
          <h1>Choose a shift</h1>
          <p>Pick up where you left off, or revisit a day at the café.</p>
        </div>
        <div className="campaign-heading-actions">
          <div className="campaign-progress" aria-label={`${progress.done} of ${progress.total} shifts complete`}>
            <div className="campaign-progress-summary">
              <span>YOUR JOURNEY</span>
              <strong>
                {progress.done}
                <small> / {progress.total}</small>
              </strong>
            </div>
            <div className="campaign-progress-track">
              <span style={{ width: `${(progress.done / progress.total) * 100}%` }} />
            </div>
          </div>
          <div className="campaign-selected">
            <div>
              <span>SELECTED SHIFT {pad2(save.selected + 1)}</span>
              <strong>{titleFor(save.selected)}</strong>
            </div>
            <Button variant="primary" onClick={() => launch(save.selected)}>
              <Play size={15} fill="currentColor" /> Play <ArrowRight size={16} />
            </Button>
          </div>
          {save.complete && (
            <Button className="campaign-ending-link" variant="text-link" onClick={() => go('/ending')}>
              Revisit closing time <ArrowRight size={14} />
            </Button>
          )}
        </div>
      </div>

      <div className="chapter-list">
        {chapters.map((chapter, chapterIndex) => (
          <section className="chapter" key={chapter.title} aria-labelledby={`chapter-${chapterIndex}`}>
            <div className="chapter-heading">
              <span className="chapter-index">{pad2(chapterIndex + 1)}</span>
              <h2 id={`chapter-${chapterIndex}`}>{chapter.title}</h2>
              <p>{chapter.subtitle}</p>
              <span className="chapter-range">
                {pad2(chapter.from + 1)}—{pad2(chapter.to)}
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
                    onClick={() => select(index)}
                    aria-label={`Shift ${index + 1}: ${titleFor(index)}${locked ? ', locked' : ''}`}
                    aria-pressed={!locked && save.selected === index}
                  >
                    <span className="card-number">
                      <span>{pad2(index + 1)}</span>
                      {locked ? (
                        <LockKeyhole size={14} />
                      ) : complete ? (
                        <Check size={15} />
                      ) : (
                        <span className="tiny-dot" />
                      )}
                    </span>
                    <strong>{titleFor(index)}</strong>
                    <span className="card-bottom">
                      <span>
                        {locked ? 'LOCKED' : complete ? 'COMPLETED' : index === save.unlocked ? 'UP NEXT' : 'READY'}
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
    </main>
  );
}
