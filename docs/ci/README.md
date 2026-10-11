# CI workflows to install

These are the intended contents of `.github/workflows/ci.yml` (new) and
`.github/workflows/a11y.yml` (adds a `push: main` trigger and
`VITE_ENABLE_DEV_ROUTES: "true"` for the audit build).

They live here because the token that opened this PR has no GitHub `workflow`
scope, so it cannot write under `.github/workflows/`. To install them, copy each
file over its `.github/workflows/` counterpart (GitHub web UI: *Add file →
Create new file* / edit `a11y.yml`, or locally `cp docs/ci/workflows/*.yml
.github/workflows/`), commit to `main` (or this branch), then delete this folder.

- `ci.yml`: typecheck (`tsc -p tsconfig.app.json`), ESLint (errors fail, warnings
  allowed), Vitest on Node, `vite build`, and a check that the dev/QA pages are
  not in the production bundle. Runs on PRs to `main` and on every push to
  `main`, so Lovable's direct commits get a status check.
- `a11y.yml`: unchanged audit, now also on push to `main`. Because the dev pages
  are now dev-only, the audit build sets `VITE_ENABLE_DEV_ROUTES=true` so it can
  keep auditing `/__design-system`. Without this change the audit still passes but
  `/__design-system` renders the 404 page instead.
