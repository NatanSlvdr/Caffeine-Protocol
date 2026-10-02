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
});
