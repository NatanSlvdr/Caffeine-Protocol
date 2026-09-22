import { FolderHeart, HelpCircle, Home, Leaf, SlidersHorizontal } from 'lucide-react';
import { go } from '@/shared/lib/navigation';

/** Side rail for every page except home and workspace. */
export function Rail({ screen, onGuide }: { screen: string; onGuide: () => void }) {
  return (
    <nav className="rail" aria-label="Main navigation">
      <button aria-label="Main menu" onClick={() => go('/')}>
        <Home size={21} />
      </button>
      <button className={screen === 'campaign' ? 'current' : ''} aria-label="Campaign" onClick={() => go('/campaign')}>
        <FolderHeart size={21} />
      </button>
      <span className="rail-spacer" />
      <button aria-label="Game guide" onClick={onGuide}>
        <HelpCircle size={21} />
      </button>
      <button aria-label="Audio and display settings" onClick={() => go('/settings')}>
        <SlidersHorizontal size={21} />
      </button>
      <Leaf className="rail-leaf" size={19} />
    </nav>
  );
}
