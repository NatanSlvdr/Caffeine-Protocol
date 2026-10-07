import { useDraggable } from '@dnd-kit/core';
import { blockFields } from '@/domain';
import { useWords } from '@/shared/language';
import { BlockIcon } from '../BlockIcon';
import { Operands } from './Operands';
import { category } from './blockMeta';
import { EDITOR_WORDS } from './editorWords';
import { useLifting } from './lifting';

export function CommandTile({
  initial,
  options,
  disabled,
  help,
  onExplain,
  onChange,
}: {
  initial: string;
  options: string[];
  disabled: boolean;
  /** What the block does, read with its button. */
  help: string;
  /** Pointing at or focusing the tile shows its help; leaving it hides it again. */
  onExplain: (command: string | null) => void;
  onChange: (command: string) => void;
}) {
  const command = initial;
  const say = useWords(EDITOR_WORDS);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: 'library:' + initial,
    data: { command },
    disabled,
  });
  const lifting = useLifting('library:' + initial);
  const fields = blockFields(command);
  const insertButton = (
    <button
      type="button"
      className={fields.family === 'STORE' ? 'store-label' : undefined}
      disabled={disabled}
      aria-label={say.insert(command)}
      aria-description={help}
      onClick={() => onChange(command)}
      {...attributes}
      {...listeners}
    >
      <BlockIcon command={command} />
      {fields.family === 'STORE' ? 'Store :' : fields.verb}
    </button>
  );
  return (
    <div
      ref={setNodeRef}
      className={'command-tile ' + category(command) + (lifting ? ' lifting' : '')}
      style={{ opacity: isDragging ? 0.4 : 1 }}
      onPointerEnter={() => onExplain(command)}
      onPointerLeave={() => onExplain(null)}
      onFocus={() => onExplain(command)}
      onBlur={() => onExplain(null)}
    >
      {fields.family !== 'STORE' && insertButton}
      <Operands
        library
        command={command}
        options={options}
        disabled={disabled}
        label={say.libraryBlock(fields.verb)}
        onChange={() => {}}
        storeLabel={insertButton}
      />
    </div>
  );
}
