import { Clock3, MoveUpRight, PenLine, ArrowRight, CircleHelp, CirclePlus, Coffee, CornerDownRight, GitBranch, Hand, ListRestart, MapPin, Package, Plus, ReceiptText, Repeat2, Settings2, SquareFunction, Ticket, Undo2, Waves } from 'lucide-react';
import { blockFields } from '../domain/blockFields';

/** Small action-specific glyphs are shared by the library, routine, and drag preview. */
export function BlockIcon({ command }: { command: string }) {
  const icons = {
    WAIT: Clock3, TICKET: Ticket, ITEM: PenLine, SUBMIT: Ticket,
    MOVE: ArrowRight, IF: GitBranch, ELSE: CornerDownRight, FOR: ListRestart,
    REPEAT: Repeat2, JUMP: MoveUpRight, POSITION: MapPin, FUNCTION: SquareFunction,
    CALL: SquareFunction, RETURN: Undo2, READ: ReceiptText, SUGAR: Plus, ADD: CirclePlus,
    TAKE: Hand, FILL: Waves, GRIND: Settings2, BREW: Coffee, STEEP: Coffee,
    PICKUP: Hand, SERVE: Coffee, COLLECT: Package,
    'RETURN CUPS': Undo2, HELP: CircleHelp, ERROR: CircleHelp,
  };
  if (command.startsWith('JUMP ')) return <svg className="block-icon jump-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 18v-5a7 7 0 0 1 14 0v3m-4-4 4 4 4-4"/></svg>;
  const family = blockFields(command).family;
  if (family === 'DEPOSIT') return <svg className="block-icon deposit-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M8 3h8v8H8zM3 20h18M6 17l-2-2m14 2 2-2"/>
  </svg>;
  const Icon = icons[family as keyof typeof icons] ?? Settings2;
  return <Icon className="block-icon" size={15} strokeWidth={1.8} aria-hidden="true"/>;
}
