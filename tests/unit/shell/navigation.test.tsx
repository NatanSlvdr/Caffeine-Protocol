import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../../src/App';

vi.mock('../../../src/shell/HomeCafePreview', () => ({ HomeCafePreview: () => <div /> }));
vi.mock('../../../src/components/Cafe', () => ({ Cafe: () => <div /> }));
vi.mock('../../../src/audio', () => ({ configureAudio: vi.fn(), playSound: vi.fn(), startAudio: vi.fn() }));

beforeEach(() => {
  window.location.hash = '/';
  localStorage.clear();
});

describe('shift entry navigation', () => {
  it('opens the selector before the selected shift', async () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Caffeine Protocol' })).toBeTruthy();
    expect(document.querySelector('.app-header')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Choose a shift' }));

    await waitFor(() => expect(window.location.hash).toBe('#/campaign'));
    expect(screen.getByRole('heading', { name: 'Every shift tells a story.' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Selected shift' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Start shift' }));
    await waitFor(() => expect(window.location.hash).toBe('#/shift/1'));
  });
});
