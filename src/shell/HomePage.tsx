import { ArrowRight, BookOpen, Settings2 } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { go, openSettings } from '@/shared/lib/navigation';
import { useGame, useProgress } from '@/state/GameStore';
import { HomeCafePreview } from './HomeCafePreview';

/** The café's front door: a menu ticket clipped to the wall beside the shop window. */
export function HomePage() {
  const { save } = useGame();
  const progress = useProgress();

  return (
    <main className="front-page">
      <section className="front-menu">
        <article className="front-ticket">
          <span className="front-clip" aria-hidden="true" />
          <p className="front-kicker">Café Niko · A cozy coding adventure</p>
          <h1 aria-label="Caffeine Protocol">
            Caffeine
            <br />
            <em>Protocol</em>
          </h1>
          <p className="front-tagline">
            A little café, a secondhand robot, and a fresh start. Teach Query one thoughtful routine at a time.
          </p>
          <div className="front-actions">
            <Button variant="primary" className="front-start" onClick={() => go('/campaign')}>
              <BookOpen size={18} />
              Choose a shift
              <ArrowRight size={19} />
            </Button>
            <button className="front-link" onClick={openSettings}>
              <Settings2 size={17} /> Settings
            </button>
          </div>
          <footer className="front-foot" aria-hidden="true">
            <p>
              <span>Served</span>
              <span>
                {progress.done}/{progress.total}
              </span>
            </p>
            <p>
              <span>Stars</span>
              <span>
                {progress.stars}/{progress.max}
              </span>
            </p>
            <span className="front-barcode" />
            <small>{progress.done > 0 ? 'Welcome back' : 'Doors open soon'}</small>
          </footer>
        </article>
      </section>
      <section className="front-window" aria-label="Preview of the café">
        <span className="front-awning" aria-hidden="true" />
        <div className="front-scene">
          <HomeCafePreview reduced={save.settings.reduced_motion} pixelArt={save.settings.pixel_art} />
        </div>
        <span className="front-sign" aria-hidden="true">
          Open
        </span>
      </section>
    </main>
  );
}
