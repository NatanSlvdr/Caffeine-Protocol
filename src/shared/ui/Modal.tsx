import { useEffect, useRef } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import { X } from 'lucide-react';
export function Modal({
  title,
  kicker,
  onClose,
  children,
  wide = false,
  className = '',
}: {
  title: string;
  kicker?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  // Only a press that starts and ends on the backdrop closes the window: the dialog's own padding is
  // also its target, and a text selection dragged out of the window ends on it too.
  const pressedBackdrop = useRef(false);
  useEffect(() => {
    const dialog = ref.current,
      previous = document.activeElement;
    dialog?.showModal();
    // showModal lands on the first button, the close X. A window can name a better start: its main
    // action, or the safe choice in a confirmation.
    dialog?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    return () => {
      dialog?.close();
      // A window opened as its button went away (the receipt, after the crew's last line) has nothing to go back
      // to, so focus carries on from the screen's title rather than the top of the page, as reclaimFocus does.
      if (previous instanceof HTMLElement && previous !== document.body && previous.isConnected) previous.focus();
      else document.querySelector<HTMLElement>('[data-screen-title]')?.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      aria-label={title}
      className={`modal ${wide ? 'wide' : ''} ${className}`}
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onPointerDown={(e) => {
        pressedBackdrop.current = onBackdrop(e);
      }}
      onClick={(e) => {
        if (pressedBackdrop.current && onBackdrop(e)) onClose();
        pressedBackdrop.current = false;
      }}
    >
      <div className="modal-top">
        {kicker ? (
          <div>
            <p className="modal-kicker">{kicker}</p>
            <h2>{title}</h2>
          </div>
        ) : (
          <h2>{title}</h2>
        )}
        <button aria-label="Close dialog" onClick={onClose}>
          <X size={20} aria-hidden="true" />
        </button>
      </div>
      {children}
    </dialog>
  );
}

/** The backdrop is the dialog element itself, hit outside its box. */
function onBackdrop(e: MouseEvent<HTMLDialogElement>): boolean {
  if (e.target !== e.currentTarget) return false;
  const box = e.currentTarget.getBoundingClientRect();
  return e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom;
}
