import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReceiptModal } from '../../../src/features/workspace/modals/ReceiptModal';
import { levels } from '../../../src/data';
import type { RunResult } from '../../../src/domain/types';

const result = (stars: number, block_count = 5, executed_instructions = 20) =>
  ({ passed: true, stars, block_count, executed_instructions, tickets: [] }) as unknown as RunResult;
const receipt = (stars: number, best?: number, observation = false, run = result(stars)) =>
  render(
    <ReceiptModal
      index={2}
      level={levels[2]}
      result={run}
      observation={observation}
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
  it('counts guests, not the tickets their drinks needed', () => {
    // Shift 06's guests order several drinks each: 12 guests, 21 tickets.
    render(
      <ReceiptModal
        index={5}
        level={levels[5]}
        result={result(3)}
        observation={false}
        onNext={() => {}}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText('Guests served').nextElementSibling?.textContent).toBe('12');
  });
  it('says whether a replay beat the shift’s best', () => {
    receipt(3, 1);
    expect(screen.getByText('New best, up from 1 star!')).toBeTruthy();
  });
  it('keeps the best when a replay falls short', () => {
    receipt(1, 3);
    expect(screen.getByText('Your best stays at 3 stars.')).toBeTruthy();
  });
  it('credits the opening day to the people who served it by hand', () => {
    receipt(0, 0, true);
    expect(screen.getByText('Niko, Moka and Pip served every order by hand.')).toBeTruthy();
    expect(screen.queryByText(/best/)).toBeNull();
  });
  it('says nothing about bests on a first serve or a matching replay', () => {
    const { unmount } = receipt(2);
    expect(screen.queryByText(/best/)).toBeNull();
    unmount();
    receipt(2, 2);
    expect(screen.queryByText(/best/)).toBeNull();
  });
  it('reads each total against its target, without the printed slash', () => {
    const { block_target, instruction_target } = levels[2];
    receipt(1, undefined, false, result(1, block_target + 1, instruction_target));
    const blocks = screen.getByText('Blocks used').nextElementSibling!;
    expect(blocks.querySelector('small')?.getAttribute('aria-hidden')).toBe('true');
    expect(blocks.querySelector('.sr-only')?.textContent).toBe(`, star target ${block_target}, missed`);
    const steps = screen.getByText('Steps run').nextElementSibling!;
    expect(steps.querySelector('.sr-only')?.textContent).toBe(`, star target ${instruction_target}, met`);
  });
  it('explains a step target met while the block target is still missed', () => {
    const { unmount } = receipt(1, undefined, false, result(1, levels[2].block_target + 1, 1));
    expect(screen.getByText(/stars climb in order: trim 1 block first/)).toBeTruthy();
    unmount();
    receipt(3, undefined, false, result(3, 1, 1));
    expect(screen.queryByText(/stars climb in order/)).toBeNull();
  });
  it('says how far off the next star is', () => {
    const { block_target, instruction_target } = levels[2];
    const { unmount } = receipt(1, undefined, false, result(1, block_target + 2, instruction_target + 9));
    expect(screen.getByText(`One more star: use 2 fewer blocks, ${block_target} or fewer.`)).toBeTruthy();
    unmount();
    const second = receipt(2, undefined, false, result(2, block_target, instruction_target + 1));
    expect(screen.getByText(`One more star: run 1 fewer step, ${instruction_target} or fewer.`)).toBeTruthy();
    second.unmount();
    receipt(3, undefined, false, result(3, block_target, instruction_target));
    expect(screen.queryByText(/One more star/)).toBeNull();
  });
});
