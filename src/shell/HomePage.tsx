import { ArrowRight, BookOpen, Settings2 } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { go } from '@/shared/lib/navigation';
import { useGame } from '@/state/GameStore';
import { HomeCafePreview } from './HomeCafePreview';

/** A quiet entry into the café and the shift board. */
export function HomePage() {
  const { save } = useGame();

  return (
    <main className="home-page">
      <section className="home-copy">
        <span className="home-kicker">A COZY CODING ADVENTURE</span>
        <h1 aria-label="Caffeine Protocol">
          Caffeine
          <br />
          <em>Protocol</em>
        </h1>
        <p>A little café, a secondhand robot, and a fresh start. Teach Query one thoughtful routine at a time.</p>
        <div className="home-actions">
          <Button variant="primary" className="large" onClick={() => go('/campaign')}>
            <BookOpen size={16} />
            Choose a shift
            <ArrowRight size={18} />
          </Button>
          <Button variant="text-link" onClick={() => go('/settings')}>
            <Settings2 size={16} /> Settings
          </Button>
        </div>
      </section>
      <section className="home-world" aria-label="Preview of the café">
        <div className="home-scene">
          <HomeCafePreview reduced={save.settings.reduced_motion} pixelArt={save.settings.pixel_art} />
        </div>
      </section>
    </main>
  );
}
