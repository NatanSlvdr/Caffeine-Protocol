import { Coffee, Hash, Leaf, MessageCircle, Package, Sparkles } from 'lucide-react';

/** Give familiar operand values a small visual cue in compact selectors. */
export function OperandIcon({ value }: { value: string }) {
  const normalized = value.toLowerCase();
  const Icon = normalized.includes('coffee') ? Coffee
    : normalized.includes('tea') ? Leaf
    : normalized.includes('speech') || normalized.includes('heard') ? MessageCircle
    : normalized.includes('sugar') || normalized.includes('sweet') ? Sparkles
    : normalized.includes('count') || normalized.includes('number') ? Hash
    : normalized.includes('paper') || normalized.includes('ticket') || normalized.includes('order') ? Package
    : undefined;
  return Icon ? <Icon className="operand-icon" size={13} strokeWidth={1.9} aria-hidden="true"/> : null;
}
