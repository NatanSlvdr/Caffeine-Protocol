import {
  Save,
  Clock3,
  MoveUpRight,
  PenLine,
  Move,
  CircleHelp,
  Coffee,
  CornerDownRight,
  GitBranch,
  Hand,
  ListRestart,
  MapPin,
  Navigation,
  Plus,
  ReceiptText,
  Repeat2,
  Settings2,
  SquareFunction,
  Ticket,
  Undo2,
} from 'lucide-react';
import { blockFields } from '@/domain';

const icons = {
  WAIT: Clock3,
  TICKET: Ticket,
  ITEM: PenLine,
  SUBMIT: Ticket,
  MOVE: Move,
  'MOVE TO': Navigation,
  IF: GitBranch,
  ELSE: CornerDownRight,
  FOR: ListRestart,
  REPEAT: Repeat2,
  JUMP: MoveUpRight,
  POSITION: MapPin,
  FUNCTION: SquareFunction,
  STORE: Save,
  CALL: SquareFunction,
  RETURN: Undo2,
  READ: ReceiptText,
  SUGAR: Plus,
  TAKE: Hand,
  DEPOSIT: Hand,
  USE: Coffee,
  HELP: CircleHelp,
  ERROR: CircleHelp,
};

/** Jump destinations get a dedicated connector glyph instead of a family icon. */
export function JumpIcon() {
  return (
    <svg
      className="block-icon jump-icon"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 18v-5a7 7 0 0 1 14 0v3m-4-4 4 4 4-4" />
    </svg>
  );
}

/** Small action-specific glyphs are shared by the library, routine, and drag preview. */
export function BlockIcon({ command }: { command: string }) {
  if (command.startsWith('JUMP ')) return <JumpIcon />;
  const family = blockFields(command).family;
  const Icon = icons[family as keyof typeof icons] ?? Settings2;
  return <Icon className="block-icon" size={15} strokeWidth={1.8} aria-hidden="true" />;
}
