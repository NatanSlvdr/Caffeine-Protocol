# ADR 004: CSS layers without @layer

- Status: accepted
- Date: 2026-09-18

## Context

Styles arrived as two long files: `styles.css` (base + first `:root` tokens)
and `playful.css` (theme overrides + second `:root`). A full `@layer`
migration was proposed.

## Decision

- Split physically, keep the cascade: `styles/tokens.css` (base `:root`),
  `styles/base.css`, `styles/themes/playful.css`, wired once via
  `styles/index.css` in the existing order. The split is byte-identical.
- Repeated literal colors become `:root` tokens (`--gold`, `--paper`,
  `--card`, …); values are unchanged, so rendering is identical.
- No `@layer` for now: unlayered author styles beat layered ones, and a
  layer migration needs a full specificity audit to avoid flipping the
  base/theme relationship. Revisit only with visual regression coverage.
- `shared/ui/Button` and `SettingRow` are class-preserving primitives for
  new code; bespoke page layouts keep their markup.

## Consequences

One stylesheet import (`main.tsx` → `styles/index.css`). No visual change is
expected from any of these moves; the e2e framing specs guard layout.
