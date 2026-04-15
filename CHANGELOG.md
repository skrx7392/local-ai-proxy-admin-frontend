# Changelog

All notable changes to the admin frontend will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- `EmptyState` primitive in `src/components/data/`. Content-only by default
  (unframed). Opt into a glass card via `framed`.
- Route error boundaries: `(admin)/error.tsx`, `login/error.tsx`, and a
  minimal `global-error.tsx` that renders without Chakra.
- Keyboard shortcuts: `g u` → `/users`, `g k` → `/keys`, `/` focuses the
  topbar "Go to…" nav input. Shared nav metadata lives in
  `src/lib/nav/navItems.ts`; consumed by `SideNav`, `ShortcutProvider`, and
  `NavSearch`.
- `e2e/a11y.spec.ts`: axe-core audit on every authenticated route plus
  `/login` and `/styleguide`. WCAG 2A + 2AA; `color-contrast` currently
  excluded pending a design-system pass.
- `e2e/screenshots.spec.ts` gated by `SCREENSHOTS=1` + `npm run
  docs:screenshots`. Writes to `docs/screenshots/{light,dark}/`. Not run in
  the default `npm run e2e`.

### Changed
- Detail pages (`/users/[id]`, `/keys/[id]`) now show a `FormSkeleton`
  while loading instead of a spinner + text. Skeletons gate on initial
  `status === 'pending'` via the existing `useMinDuration` — background
  refetches keep the current data on screen.
- `DataTable`'s default empty branch renders `EmptyState`.
- All list pages (`/keys`, `/users`, `/accounts`, `/pricing`,
  `/registrations`, `/registration-tokens`, `/usage`) migrated from
  ad-hoc `<Text>` empty messages to `EmptyState`.
- `SideNav` now reads from the shared `NAV_ITEMS` module.

### Fixed
- `/styleguide` blur-mode `<select>` missing an accessible name.

## FE history (backfilled from PR titles)

Earlier milestones merged as squash commits; links are to the respective PRs.

- **G** — `/config` page + topbar health indicator (BE 5 pair) — #39
- **F** — `/usage` analytics + dashboard StatCards & mini timeseries — #38
- **E** — user + key detail pages with role/rate/session-limit mutations — #37
- **D** — strict envelope + URL-synced list state + `/registrations` — #36
- **C** — first feature slice (keys/users/accounts/pricing/registration tokens)
- **B** — next-auth v5 JWT + BFF proxy + `/login`
- **A** — repo bootstrap, Chakra v3 design system, `/styleguide`
