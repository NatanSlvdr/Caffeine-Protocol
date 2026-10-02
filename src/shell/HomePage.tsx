import { ArrowRight, BookOpen, CircleHelp, Settings2 } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Tally } from '@/shared/ui/Tally';
import { go, openGuide, openSettings } from '@/shared/lib/navigation';
import { useCafeName, useGame, useProgress } from '@/state/GameStore';
import { HomeCafePreview } from './HomeCafePreview';

/** The café's front door: a menu ticket pinned over the live café, which runs in the background. */
export function HomePage() {
  const { save } = useGame();
  const progress = useProgress();
  const cafe = useCafeName();

  return (
    <main className="front-page">
      <div className="front-scene" aria-hidden="true">
        <HomeCafePreview reduced={save.settings.reduced_motion} pixelArt={save.settings.pixel_art} />
      </div>
      <section className="front-menu">
        <article className="front-ticket">
          <span className="front-clip" aria-hidden="true" />
          <p className="front-kicker">{cafe} · A cozy coding adventure</p>
          <h1 aria-label="Caffeine Protocol" data-screen-title tabIndex={-1}>
            Caffeine
            <br />
            <em>Protocol</em>
          </h1>
          <p className="front-tagline">
            A little café, a secondhand robot, and a fresh start. Teach Query one thoughtful routine at a time, until
            the café runs itself.
          </p>
          <div className="front-actions">
            <Button variant="primary" className="front-start" onClick={() => go('/campaign')}>
              <BookOpen size={18} aria-hidden="true" />
              Choose a shift
              <ArrowRight size={19} aria-hidden="true" />
            </Button>
            <div className="front-links">
              <button className="front-link" aria-haspopup="dialog" onClick={openGuide}>
                <CircleHelp size={17} aria-hidden="true" /> How to play
              </button>
              <button className="front-link" aria-haspopup="dialog" onClick={openSettings}>
                <Settings2 size={17} aria-hidden="true" /> Settings
              </button>
            </div>
          </div>
          <footer className="front-foot">
            <p>
              <span>Served</span>
              <span>
                <Tally n={progress.done} of={progress.total} />
              </span>
            </p>
            <p>
              <span>Stars</span>
              <span>
                <Tally n={progress.stars} of={progress.max} />
              </span>
            </p>
            <span className="front-barcode" aria-hidden="true" />
            <small>
              {save.complete ? 'Under new management' : progress.done > 0 ? 'Welcome back' : 'Doors open soon'}
            </small>
          </footer>
        </article>
      </section>
    </main>
  );
}
