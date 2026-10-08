import { useEffect, useRef, useState } from 'react';
import { Sparkles, TriangleAlert, X } from 'lucide-react';
import { reclaimFocus } from '@/shared/lib/focus';
import { openSettings } from '@/shared/lib/navigation';
import { useGame } from '@/state/GameStore';
import { useWords } from '@/shared/language';
import { SAVE_NOTICE_WORDS } from './saveNoticeWords';

/**
 * A save problem pinned over every screen, so progress never goes quietly unsaved; failing that, once, what updating
 * an older café to this version changed.
 */
export function SaveNotice() {
  const { saveError, elsewhere, loadElsewhere, keepThisTab, updated, dismissUpdated } = useGame();
  const say = useWords(SAVE_NOTICE_WORDS);
  // Dismissing hides this message only: a different problem later shows again.
  const [dismissed, setDismissed] = useState('');
  // The Dismiss button goes with the notice, so focus carries on from the screen's title, not the top of the page.
  const read = useRef(false);
  useEffect(() => {
    if (dismissed || read.current) reclaimFocus();
    read.current = false;
  }, [dismissed, updated]);
  // Keeping this tab's progress takes the other-tab notice away with the focused button, so the same goes for it.
  const shown = useRef(false);
  useEffect(() => {
    if (elsewhere) shown.current = true;
    else if (shown.current) {
      shown.current = false;
      reclaimFocus();
    }
  }, [elsewhere]);
  // Nothing is being saved until the player chooses, so this one can't be dismissed.
  if (elsewhere)
    return (
      <div className="save-notice" role="alert">
        <TriangleAlert size={18} aria-hidden="true" />
        <p>{say.elsewhere}</p>
        <button className="save-notice-open" onClick={loadElsewhere}>
          {say.loadNewer}
        </button>
        <button className="save-notice-keep" onClick={keepThisTab}>
          {say.keepThis}
        </button>
      </div>
    );
  if (!saveError || saveError === dismissed)
    return updated.length ? (
      <div className="save-notice is-update" role="status">
        <Sparkles size={18} aria-hidden="true" />
        <p>
          <strong>{say.updated}</strong> {updated.map(say.change).join(' ')}
        </p>
        <button
          className="save-notice-close"
          aria-label={say.dismiss}
          title={say.dismiss}
          onClick={() => {
            read.current = true;
            dismissUpdated();
          }}
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
    ) : null;
  return (
    <div className="save-notice" role="alert">
      <TriangleAlert size={18} aria-hidden="true" />
      <p>{say.problems[saveError]}</p>
      <button className="save-notice-open" aria-haspopup="dialog" onClick={openSettings}>
        {say.openSettings}
      </button>
      <button
        className="save-notice-close"
        aria-label={say.dismiss}
        title={say.dismiss}
        onClick={() => setDismissed(saveError)}
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
