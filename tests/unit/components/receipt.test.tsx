import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReceiptModal } from '../../../src/features/workspace/modals/ReceiptModal';
import { levels } from '../../../src/data';
import type { RunResult } from '../../../src/domain/types';

const result = (stars: number) =>
  ({ passed: true, stars, block_count: 5, executed_instructions: 20, tickets: [] }) as unknown as RunResult;
const receipt = (stars: number, best?: number) =>
  render(
    <ReceiptModal
      index={2}
      level={levels[2]}
      result={result(stars)}
      observation={false}
      best={best}
      onNext={() => {}}
      onClose={() => {}}
    />,
  );

describe('service receipt', () => {
  beforeEach(() => {
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close = function () {
      this.removeAttribute('open');
    };
  });
  it('says whether a replay beat the shift’s best', () => {
    receipt(3, 1);
    expect(screen.getByText('New best, up from 1 star!')).toBeTruthy();
  });
  it('keeps the best when a replay falls short', () => {
    receipt(1, 3);
    expect(screen.getByText('Your best stays at 3 stars.')).toBeTruthy();
  });
  it('says nothing about bests on a first serve or a matching replay', () => {
    const { unmount } = receipt(2);
    expect(screen.queryByText(/best/)).toBeNull();
    unmount();
    receipt(2, 2);
    expect(screen.queryByText(/best/)).toBeNull();
  });
});
