import { ArrowDownToLine, ArrowLeft, ArrowRight, BatteryCharging, CircleHelp, CirclePlus, Coffee, Coins, CornerDownRight, Ear, GitBranch, Hand, ListRestart, MapPin, Package, Plus, ReceiptText, Repeat2, Settings2, SquareFunction, Ticket, Undo2, Waves } from 'lucide-react';
import { blockFields } from '../domain/blockFields';

/** Small action-specific glyphs are shared by the library, routine, and drag preview. */
export function BlockIcon({ command }: { command: string }) {
  const icons = {
    WAIT: Ear, TICKET: Ticket, ITEM: CirclePlus, 'CHARGE ORDER': Coins, SUBMIT: Ticket,
    MOVE: ArrowRight, IF: GitBranch, ELSE: CornerDownRight, EACH: ListRestart,
    REPEAT: Repeat2, JUMP: ArrowLeft, POSITION: MapPin, FUNCTION: SquareFunction,
    CALL: SquareFunction, RETURN: Undo2, READ: ReceiptText, SUGAR: Plus, ADD: CirclePlus,
    TAKE: Hand, FILL: Waves, GRIND: Settings2, BREW: Coffee, STEEP: Coffee,
    DEPOSIT: ArrowDownToLine, PICKUP: Hand, SERVE: Coffee, COLLECT: Package,
    'RETURN CUPS': Undo2, CHARGE: BatteryCharging, HELP: CircleHelp, ERROR: CircleHelp,
  };
  const family = blockFields(command).family;
  const Icon = icons[family as keyof typeof icons] ?? Settings2;
  return <Icon className="block-icon" size={15} strokeWidth={1.8} aria-hidden="true"/>;
}
