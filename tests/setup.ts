import { afterEach, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';

// The app fetches its shift screens after startup; tests render them straight away, so they are fetched first.
beforeAll(async () => {
  const { preloadScreens } = await import('../src/app/screens');
  await preloadScreens();
});

// Shared vitest setup: isolate DOM + storage between tests.
afterEach(() => {
  cleanup();
  try {
    localStorage.clear();
  } catch {
    // jsdom storage may be unavailable in some environments; tests seed it explicitly.
  }
});
