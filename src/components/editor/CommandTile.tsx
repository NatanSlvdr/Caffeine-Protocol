import { useDraggable } from '@dnd-kit/core';
import { blockFields } from '@/domain';
import { BlockIcon } from '../BlockIcon';
import { Operands } from './Operands';
import { category } from './blockMeta';

export function CommandTile({
  initial,
  options,
  disabled,
  onChange,
}: {
  initial: string;
  options: string[];
  disabled: boolean;
  onChange: (command: string) => void;
}) {
  const command = initial;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: 'library:' + initial, data: { command }, disabled });
  const fields = blockFields(command);
  const insertButton = (
    <button
      type="button"
      className={fields.family === 'STORE' ? 'store-label' : undefined}
      disabled={disabled}
      aria-label={'Insert ' + command}
      onClick={() => onChange(command)}
      {...attributes}
      {...listeners}
    >
      <BlockIcon command={command} />
      {fields.family === 'STORE' ? 'Store :' : fields.verb}
    </button>
  );
  return (
    <div ref={setNodeRef} className={'command-tile ' + category(command)} style={{ opacity: isDragging ? 0.4 : 1 }}>
      {fields.family !== 'STORE' && insertButton}
      <Operands
        library
        command={command}
        options={options}
        disabled={disabled}
        label={'Library ' + fields.verb}
        onChange={() => {}}
        storeLabel={insertButton}
      />
    </div>
  );
}
