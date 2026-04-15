# local-ai-proxy-admin-frontend

Admin UI for [`local-ai-proxy`](../local-ai-proxy). Next.js App Router +
Chakra v3 + next-auth v5. Deployed at `admin.ai.kinvee.in`.

See [`PLAN.md`](./PLAN.md) for the canonical plan (mirrored from the
backend repo).

## Screenshots

Light and dark theme snapshots for the main pages. Regenerate with
`npm run docs:screenshots`.

| | Dark | Light |
|---|---|---|
| Login | ![login dark](docs/screenshots/dark/login.png) | ![login light](docs/screenshots/light/login.png) |
| Dashboard | ![dashboard dark](docs/screenshots/dark/dashboard.png) | ![dashboard light](docs/screenshots/light/dashboard.png) |
| Keys | ![keys dark](docs/screenshots/dark/keys.png) | ![keys light](docs/screenshots/light/keys.png) |
| Usage | ![usage dark](docs/screenshots/dark/usage.png) | ![usage light](docs/screenshots/light/usage.png) |
| Styleguide | ![styleguide dark](docs/screenshots/dark/styleguide.png) | ![styleguide light](docs/screenshots/light/styleguide.png) |

## Quickstart

```bash
cp .env.example .env.local
# Fill in AUTH_SECRET (32+ chars) and BACKEND_URL
npm install
npm run dev
```

The dev server runs at `http://localhost:3000`. Traffic to
`/api/admin/*` is proxied server-side to `BACKEND_URL` with the session's
backend token injected as a Bearer header.

## Architecture

- **Always-proxy BFF.** The browser never talks to the backend directly.
  Every admin call goes through `src/app/api/admin/[...path]/route.ts`,
  which runs on the Next server, resolves the JWT via `getToken()`, and
  forwards the upstream request.
- **Session token off the client.** next-auth v5 with the JWT strategy
  folds the backend session token into the encrypted JWT cookie. The
  `session` callback strips it before it reaches the browser; only the
  BFF (via `getToken()`) can read it.
- **App Router only.** No `pages/`. Route handlers live under
  `src/app/api/`.
- **Strict TypeScript.** `noUncheckedIndexedAccess` and
  `exactOptionalPropertyTypes` are on.

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `g u` | Go to `/users` |
| `g k` | Go to `/keys` |
| `/` | Focus the topbar "Go to…" search input |

Shortcuts are suppressed while focus is in an input/textarea/editable
element, or while Ctrl/Meta/Alt are held.

## Testing

```bash
npm run typecheck        # tsc --noEmit
npm run lint             # eslint .
npm test                 # vitest run (unit/component)
npm run e2e              # Playwright — full E2E incl. axe a11y spec
npm run docs:screenshots # Regenerate README screenshots (writes PNGs)
```

Testing layers:

- **Unit/component:** Vitest + jsdom + MSW (browser mode for hooks).
- **E2E:** Playwright, served via `next build && standalone`. A real
  Node HTTP backend impersonator lives at `e2e/mockBackend.mjs` — MSW
  cannot intercept Next server-side `fetch()`.
- **Accessibility:** `e2e/a11y.spec.ts` runs axe-core on every authed
  route + `/login` + `/styleguide`. WCAG 2A + 2AA; `color-contrast` is
  excluded pending a design-system token pass.

## Design system

Lives under `src/theme/*` and is reviewable at `/styleguide` (gated by
auth). Changes to tokens, recipes, or the `dataViz` palette belong in
the design-system PR, not in feature work.

## Changelog

See [`CHANGELOG.md`](./CHANGELOG.md).
