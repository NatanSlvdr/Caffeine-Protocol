import { Coffee, Settings2, Star } from 'lucide-react';
import { go } from '@/shared/lib/navigation';
import { useProgress } from '@/state/GameStore';

/** Brand, café status, star total, and settings entry. */
export function AppHeader() {
  const progress = useProgress();
  return (
    <header className="app-header">
      <button className="brand" onClick={() => go('/')}>
        <span className="brand-icon">
          <Coffee size={22} />
        </span>
        <span>
          caffeine<span className="brand-light"> protocol</span>
          <small>A LITTLE LOGIC. A LOT OF HEART.</small>
        </span>
      </button>
      <div className="header-center">
        <span className="status-dot" /> YOUR NEIGHBORHOOD CAFÉ
      </div>
      <div className="header-actions">
        <span className="star-total">
          <Star size={15} /> {progress.stars}
          <small>/ {progress.max}</small>
        </span>
        <button aria-label="Settings" title="Settings" onClick={() => go('/settings')}>
          <Settings2 size={19} />
        </button>
      </div>
    </header>
  );
}
