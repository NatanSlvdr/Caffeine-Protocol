# Agent instructions

## Testing

- Do not run the Playwright / Chrome e2e tests (`npm run test:e2e`, `npx playwright test`) unless the user explicitly asks for it.
- Default checks after a change: `npx tsc --noEmit`, `npx eslint src tests`, `npx knip`, `npm run validate:data` and `npx vitest run`.
- No visual QA in the browser preview unless asked.
