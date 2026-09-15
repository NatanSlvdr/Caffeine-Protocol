import { ModelThumbnail } from './ModelThumbnail';
import { Hash, MessageCircle, Package, Sparkles } from 'lucide-react';

/** Give familiar operand values a small visual cue in compact selectors. */
export function OperandIcon({ value }: { value: string }) {
  const normalized = value.toLowerCase();
  if (normalized === 'coffee' || normalized === 'tea') return <ModelThumbnail model={normalized}/>;
  const Icon = normalized.includes('speech') || normalized.includes('heard') ? MessageCircle
    : normalized.includes('sugar') || normalized.includes('sweet') ? Sparkles
    : normalized.includes('count') || normalized.includes('number') ? Hash
    : normalized.includes('paper') || normalized.includes('ticket') || normalized.includes('order') ? Package
    : undefined;
  return Icon ? <Icon className="operand-icon" size={13} strokeWidth={1.9} aria-hidden="true"/> : null;
}
