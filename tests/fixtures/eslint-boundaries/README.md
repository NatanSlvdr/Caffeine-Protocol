# ESLint boundary fixtures

These fixtures prove the architecture boundaries in `eslint.config.mjs` fail
on forbidden imports. They live under `tests/fixtures/**`, which is ignored
by normal `npm run lint` (and has `boundaries/dependencies` off), so they never
break the build.

`tests/unit/architecture-boundaries.test.ts` reads each fixture and lints its
contents with `ESLint.lintText(code, { filePath })`, using the virtual `src/…`
path in the header. Forbidden fixtures must produce a
`boundaries/dependencies` error; allowed fixtures must be clean.

- `forbidden-*` — must fail (domain→data, features→data/shell, components→features,
  hooks→features/data/components, data→components, shared-lib→hooks, shared-root→domain).
- `allowed-*` — must pass (hooks→domain/shared-root, components→hooks,
  shell→data, shared-lib→shared-root, features→hooks, app-shell→hooks).
