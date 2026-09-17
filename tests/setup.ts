import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Shared vitest setup: isolate DOM + storage between tests.
afterEach(() => {
  cleanup();
  try {
    localStorage.clear();
  } catch {
    // jsdom storage may be unavailable in some environments; tests seed it explicitly.
  }
});
