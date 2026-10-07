import { ArrowDown, ArrowUp, Copy, Trash2 } from 'lucide-react';
import type { VisualBlock } from '@/domain';
import { useWords } from '@/shared/language';
import { canMove, copyBlocker } from './blockEdits';
import { EDITOR_WORDS } from './editorWords';

export type BlockAction = 'copy' | 'up' | 'down' | 'remove';

/**
 * Buttons beside the picked block, for what a drag does without dragging: copy it, move it a step, or take it out,
 * with its group. One that can't act stays focusable and says why when pressed, so the toolbar never shifts under a
 * finger or loses keyboard focus.
 */
export function BlockActions({
  block,
  ordinal,
  source,
  onAct,
}: {
  block: VisualBlock;
  ordinal: number;
  source: string;
  onAct: (action: BlockAction) => void;
}) {
  // An else row is only the head of its branch: it can be taken out with it, but not copied or moved alone.
  const branch = block.command === 'ELSE';
  const say = useWords(EDITOR_WORDS).actions;
  const buttons: { action: BlockAction; label: string; icon: typeof Copy; off: boolean }[] = [
    { action: 'copy', label: say.copy, icon: Copy, off: !!copyBlocker(source, block) },
    { action: 'up', label: say.up, icon: ArrowUp, off: !canMove(source, block.line, 'up') },
    { action: 'down', label: say.down, icon: ArrowDown, off: !canMove(source, block.line, 'down') },
    { action: 'remove', label: say.remove, icon: Trash2, off: false },
  ];
  return (
    <div className="block-actions" role="group" aria-label={say.block(ordinal)}>
      {buttons
        .filter(({ action }) => !branch || action === 'remove')
        .map(({ action, label, icon: Icon, off }) => (
          <button
            key={action}
            type="button"
            data-action={action}
            aria-disabled={off || undefined}
            title={label}
            onClick={() => onAct(action)}
          >
            <Icon size={14} aria-hidden="true" />
            <span className="sr-only">{label}</span>
          </button>
        ))}
    </div>
  );
}
