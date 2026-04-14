# local-ai-proxy-admin-frontend

See `PLAN.md` (repo root) for the canonical plan. This file holds
**frontend-specific** conventions only.

## Conventions

- **BFF proxy is the only place raw `fetch` to the backend is allowed.**
  All hooks and client code must go through `apiFetch` (`src/lib/api/client.ts`).
  The sole exception is `src/app/api/admin/[...path]/route.ts`, which runs on
  the Next server and forwards to `BACKEND_URL`. A future lint rule will
  enforce this.

- **Backend session token never reaches the browser.** It lives inside the
  encrypted next-auth JWT cookie; the `session` callback strips it. BFF reads
  it via `getToken()` (server-only).

- **App Router only.** No `pages/`. Route handlers live under `src/app/api/`.

- **Strict TypeScript.** `noUncheckedIndexedAccess` and
  `exactOptionalPropertyTypes` are on — treat them as hard constraints.

- **Testing layers** (see PLAN.md "Testing Layers"):
  - Unit/component: Vitest + MSW browser mode (lands in A3).
  - E2E: Playwright + `e2e/mockBackend.mjs` real Node HTTP server on :9999
    (lands in A3). MSW cannot intercept Next server-side `fetch()`.

- **Design system** ships in A2 under `src/theme/*`. Feature PRs consume it;
  they do not invent new styles.
