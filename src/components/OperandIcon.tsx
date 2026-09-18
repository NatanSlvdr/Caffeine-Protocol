import { operandKind } from '@/domain';
import { ModelThumbnail } from './thumbnails/ModelThumbnail';
import { Circle, Square, Triangle, Diamond, ReceiptText, Hash, MessageCircle, Package } from 'lucide-react';

const variableIcons = [Circle, Square, Triangle, Diamond];
const kindIcons = { receipt: ReceiptText, speech: MessageCircle, count: Hash, paper: Package };

/** Give familiar operand values a small visual cue in compact selectors. */
export function OperandIcon({ value }: { value: string }) {
  const kind = operandKind(value);
  if (kind.kind === 'variable') {
    const Icon = variableIcons[kind.slot - 1];
    return <Icon className={`operand-icon variable-icon variable-${kind.slot}`} size={13} aria-hidden="true" />;
  }
  if (kind.kind === 'model') return <ModelThumbnail model={kind.model} />;
  if (kind.kind === 'icon') {
    const Icon = kindIcons[kind.icon];
    return <Icon className="operand-icon" size={13} strokeWidth={1.9} aria-hidden="true" />;
  }
  return null;
}
