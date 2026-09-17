import { ModelThumbnail } from './ModelThumbnail';
import { Circle, Square, Triangle, Diamond, ReceiptText, Hash, MessageCircle, Package } from 'lucide-react';

/** Give familiar operand values a small visual cue in compact selectors. */
export function OperandIcon({ value }: { value: string }) {
  const normalized = value.toLowerCase();
  const variable=/^var ?([1-4])$/.exec(normalized);
  if(variable){const Icon=[Circle,Square,Triangle,Diamond][Number(variable[1])-1];return <Icon className={`operand-icon variable-icon variable-${variable[1]}`} size={13} aria-hidden="true"/>;}
  if (normalized === 'coffee' || normalized === 'tea' || normalized === 'sugar') return <ModelThumbnail model={normalized}/>;
  if (normalized.includes('sugar') || normalized.includes('sweet')) return <ModelThumbnail model="sugar"/>;
  const Icon = normalized==='item'?ReceiptText:normalized.includes('speech') || normalized.includes('heard') ? MessageCircle
    : normalized.includes('count') || normalized.includes('number') ? Hash
    : normalized.includes('paper') || normalized.includes('ticket') || normalized.includes('order') ? Package
    : undefined;
  return Icon ? <Icon className="operand-icon" size={13} strokeWidth={1.9} aria-hidden="true"/> : null;
}
