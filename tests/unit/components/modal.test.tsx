import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Modal } from '../../../src/shared/ui/Modal';

const box = { left: 100, right: 300, top: 100, bottom: 300 } as DOMRect;
const press = (target: Element, x: number, y: number) => {
  fireEvent.pointerDown(target, { clientX: x, clientY: y });
  fireEvent.click(target, { clientX: x, clientY: y });
};

describe('modal backdrop', () => {
  beforeEach(() => {
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close = function () {
      this.removeAttribute('open');
    };
    HTMLDialogElement.prototype.getBoundingClientRect = () => box;
  });
  const open = () => {
    const onClose = vi.fn();
    render(
      <Modal title="Field notes" onClose={onClose}>
        <p>Inside</p>
      </Modal>,
    );
    return { onClose, dialog: screen.getByRole('dialog', { name: 'Field notes' }) };
  };

  it('names its close button on hover, with Escape as its shortcut', () => {
    open();
    const close = screen.getByRole('button', { name: 'Close dialog' });
    expect([close.title, close.getAttribute('aria-keyshortcuts')]).toEqual(['Close · Esc', 'Escape']);
  });

  it('closes on a press outside the window', () => {
    const { onClose, dialog } = open();
    press(dialog, 20, 20);
    expect(onClose).toHaveBeenCalledOnce();
  });
  it('stays open on a press in the window’s own padding', () => {
    const { onClose, dialog } = open();
    press(dialog, 110, 110);
    expect(onClose).not.toHaveBeenCalled();
  });
  it('stays open when a press inside ends on the backdrop', () => {
    const { onClose, dialog } = open();
    fireEvent.pointerDown(screen.getByText('Inside'), { clientX: 150, clientY: 150 });
    fireEvent.click(dialog, { clientX: 20, clientY: 20 });
    expect(onClose).not.toHaveBeenCalled();
  });
  it('opens on the action the window names, not the close button', () => {
    render(
      <Modal title="Start over?" onClose={vi.fn()}>
        <button type="button">Start over</button>
        <button type="button" data-autofocus>
          Keep my café
        </button>
      </Modal>,
    );
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Keep my café' }));
  });
  it('hands focus back to its button, or to the screen’s title when the button went away with it', () => {
    function Shift({ replaces }: { replaces: boolean }) {
      const [open, setOpen] = useState(false);
      return (
        <>
          <h2 data-screen-title tabIndex={-1}>
            Shift 03
          </h2>
          {(!open || !replaces) && <button onClick={() => setOpen(true)}>See the receipt</button>}
          {open && (
            <Modal title="Service complete" onClose={() => setOpen(false)}>
              <p>Receipt</p>
            </Modal>
          )}
        </>
      );
    }
    for (const replaces of [false, true]) {
      const { unmount } = render(<Shift replaces={replaces} />);
      const opener = screen.getByRole('button', { name: 'See the receipt' });
      opener.focus();
      fireEvent.click(opener);
      fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }));
      expect(document.activeElement).toBe(
        replaces
          ? screen.getByRole('heading', { name: 'Shift 03' })
          : screen.getByRole('button', { name: 'See the receipt' }),
      );
      unmount();
    }
  });
});
