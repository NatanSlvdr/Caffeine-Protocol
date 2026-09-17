import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { CampaignTrail } from '../src/components/CampaignTrail';
import { newSave } from '../src/domain/persistence';
import { CAMPAIGN_LENGTH, titleFor } from '../src/data';

vi.mock('../src/components/ModelThumbnail', () => ({ ModelThumbnail: ({ model }: { model: string }) => <span data-model={model}/> }));
afterEach(cleanup);

describe('campaign trail', () => {
  it('shows every shift and prevents selecting locked shifts', () => {
    const onSelect = vi.fn();
    render(<CampaignTrail save={newSave()} onSelect={onSelect} onLaunch={vi.fn()} onEnding={vi.fn()}/>);
    const trail = within(screen.getByRole('region', { name: 'Shift trail' }));
    expect(trail.getAllByRole('button')).toHaveLength(CAMPAIGN_LENGTH);
    fireEvent.click(trail.getByRole('button', { name: /^Shift 2:/ }));
    expect(onSelect).not.toHaveBeenCalled();
    fireEvent.click(trail.getByRole('button', { name: /^Shift 1:/ }));
    expect(onSelect).toHaveBeenCalledWith(0);
  });

  it.each([ [1, false, false, false], [2, true, false, false], [13, true, false, false], [14, true, true, false], [21, true, true, false], [22, true, true, true] ])('at progress index %i keeps robot landmarks aligned with unlocks', (unlocked, query, brew, porter) => {
    render(<CampaignTrail save={{ ...newSave(), unlocked }} onSelect={vi.fn()} onLaunch={vi.fn()} onEnding={vi.fn()}/>);
    for (const [name, open, level] of [['Query', query, 3], ['Brew', brew, 15], ['Porter', porter, 23]] as const) {
      expect(screen.getByLabelText(`Meet ${name}, ${open ? 'unlocked' : `unlocks at shift ${level}`}`)).toBeTruthy();
    }
  });

  it('previews and launches the selected completed shift for replay', () => {
    const save = { ...newSave(), unlocked: 3, selected: 2, stars: { 0: 0, 1: 0, 2: 2 } };
    const onLaunch = vi.fn();
    render(<CampaignTrail save={save} onSelect={vi.fn()} onLaunch={onLaunch} onEnding={vi.fn()}/>);
    const selected = screen.getByRole('button', { name: /^Shift 3:.*complete/ });
    expect(selected.getAttribute('aria-pressed')).toBe('true');
    expect(within(selected).getByLabelText('2 stars')).toBeTruthy();
    expect(screen.getByRole('heading', { name: titleFor(2) })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Replay shift' }));
    expect(onLaunch).toHaveBeenCalledWith(2);
  });
});
