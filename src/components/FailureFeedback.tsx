import { variableLabels } from '@/domain';
import { createPortal } from 'react-dom';
import type { RefObject } from 'react';
import { useAnchoredPosition } from '@/hooks/useAnchoredPosition';

/** Put the warning outside the scrolling code pane, beside the failing line. */
export function InstructionError({
  message,
  anchor,
}: {
  message: string;
  onEdit?: () => void;
  anchor?: RefObject<HTMLDivElement | null>;
}) {
  const position = useAnchoredPosition(anchor);
  if (!anchor) return <span className="error-note" role="alert">{variableLabels(message)}</span>;
  return position
    ? createPortal(<div className="line-error-callout" role="alert" style={position}>{variableLabels(message)}</div>, document.body)
    : null;
}
