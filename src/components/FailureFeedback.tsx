import { useEffect, useRef } from 'react';
import { AlertCircle } from 'lucide-react';

export function explainFailure(reason: string) {
  const drink = /^Wrong item on ticket (\d+): expected (.+), got (.+)\.$/.exec(reason);
  if (drink) return 'This guest asked for ' + drink[2] + ', but ticket ' + drink[1] + ' says ' + drink[3] + '. Check the If condition and the drink selected in Add.';
  if (reason === 'No ticket was created.') return 'The kitchen never received a ticket. Create one, add the requested drink, then move right and submit it.';
  return reason;
}

/** One restrained impact per failed run; reduced-motion users keep the static error treatment. */
export function FailureImpact({ reduced }: { reduced: boolean }) {
  const overlay = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (reduced || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const animation = overlay.current?.parentElement?.animate?.([
      { transform: 'translateX(0)' }, { transform: 'translateX(-4px)' },
      { transform: 'translateX(3px)' }, { transform: 'translateX(-2px)' }, { transform: 'translateX(0)' },
    ], { duration: 320, easing: 'ease-out' });
    return () => animation?.cancel();
  }, [reduced]);
  return <div ref={overlay} className={'failure-impact' + (reduced ? ' motion-reduced' : '')} aria-hidden="true"/>;
}

export function InstructionError({ message, onEdit }: { message: string; onEdit?: () => void }) {
  return <div className="instruction-error" role="alert"><AlertCircle size={16}/><div>
    <strong>Let’s fix this instruction</strong><p>{message}</p>
    {onEdit && <button type="button" onClick={onEdit}>Edit program</button>}
  </div></div>;
}
