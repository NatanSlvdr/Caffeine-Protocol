import { ArrowRight } from 'lucide-react';
import { CAMPAIGN_LENGTH } from '@/data';
import { Cafe } from '@/components';
import { Button } from '@/shared/ui/Button';
import { stories } from '@/data/campaign/narrative';
import { go } from '@/shared/lib/navigation';
import { pad2 } from '@/shared/lib/format';
import { useGame, useProgress } from '@/state/GameStore';

/** Between-shifts story beat with its entry into the next shift. */
export function InterludePage({ index }: { index: number }) {
  const { save, update } = useGame();
  return (
    <main className="story-page">
      <div className="story-world">
        <Cafe
          level={index + 1}
          evening={index > 10}
          reduced={save.settings.reduced_motion}
          pixelArt={save.settings.pixel_art}
        />
      </div>
      <section>
        <span className="eyebrow">BETWEEN SHIFTS / {pad2(index + 1)}</span>
        <h1>{stories[index].title}</h1>
        <p className="story-text">{stories[index].text}</p>
        <Button
          variant="primary"
          onClick={() => {
            update((s) => ({ ...s, story: { ...s.story, [index]: true } }));
            go(`/shift/${index + 1}`);
          }}
        >
          Let's open the café <ArrowRight size={17} />
        </Button>
      </section>
    </main>
  );
}

/** Closing screen after the final shift. */
export function EndingPage() {
  const { save } = useGame();
  const progress = useProgress();
  return (
    <main className="story-page ending-page">
      <div className="story-world">
        <Cafe evening reduced={save.settings.reduced_motion} pixelArt={save.settings.pixel_art} />
        <span className="ending-thanks">THANK YOU FOR SPENDING A LITTLE TIME AT OUR CAFÉ.</span>
      </div>
      <section>
        <span className="eyebrow">EMPLOYEE OF THE MONTH</span>
        <h1>Closing time.</h1>
        <span className="dialogue-name">QUERY</span>
        <blockquote>“That is not in my instruction set.”</blockquote>
        <span className="dialogue-name">NIKO</span>
        <blockquote>“It is now.”</blockquote>
        <p>The counter, kitchen, and floor are working together. Every cup follows your instructions.</p>
        <p>Niko sits down with a warm coffee. The café can finally run itself.</p>
        <p>All three routines complete. Thank you for playing.</p>
        <div className="ending-score">
          {CAMPAIGN_LENGTH} SHIFTS COMPLETE <span>·</span> {progress.stars} / {progress.max} ★
        </div>
        <Button variant="primary" onClick={() => go('/')}>
          Back to the café <ArrowRight size={16} />
        </Button>
        <Button variant="text-link" onClick={() => go('/campaign')}>
          Keep tinkering
        </Button>
      </section>
    </main>
  );
}
