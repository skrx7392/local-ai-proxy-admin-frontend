# Local AI Proxy — Admin Expansion & Admin Frontend Plan

Canonical plan for the Admin API expansion on the `local-ai-proxy` backend and the greenfield `local-ai-proxy-admin-frontend` repo. Covers locked decisions, the design system, PR sequencing, and dependencies between the two codebases.

---

## Table of Contents

1. [Locked Decisions](#locked-decisions)
2. [Stack](#stack)
3. [Design System](#design-system)
4. [Backend PR Sequence](#backend-pr-sequence)
5. [Backend Follow-ups (discovered during FE PR C)](#backend-follow-ups-discovered-during-fe-pr-c)
6. [Frontend PR Sequence](#frontend-pr-sequence)
7. [Sequencing & Dependencies](#sequencing--dependencies)
8. [Deployment Plan](#deployment-plan)
9. [Next Steps](#next-steps)

---

## Locked Decisions

| # | Question | Decision |
|---|---|---|
| 1 | `/registrations` source | Add `registration_events` table |
| 2 | Credits in analytics | Add `credits_charged` column to `usage_logs` |
| 3 | Version string | ldflags injection (`-X main.version=$GIT_SHA`) |
| 4 | Envelope default flip | Flip in dedicated PR after FE stable |
| 5 | Rate-limit cap | 10,000 rpm max |
| 6 | Key search `?q=` | Skip v1 — revisit later |
| 7 | DB pool stats | Full set → Prometheus only, not `/admin/health` |
| 8 | Shared Zod package | None v1 |
| 9 | PR 0 endpoint | Extend existing `POST /api/auth/login` + role-based admin middleware |
| 10 | Session strategy | next-auth v5 (beta) **JWT strategy**; backend session token carried inside encrypted JWT cookie (no DB adapter — backend stores only `token_hash`, raw token isn't recoverable) |
| 11 | First-admin bootstrap | **Reusable** `ADMIN_BOOTSTRAP_TOKEN` env + `POST /api/admin/bootstrap` (mounted **outside** admin `authMiddleware`). Endpoint is active whenever the env var is set; operator rotates/unsets the token between uses. This path is also the DR recovery mechanism. No one-shot DB marker. |
| 12 | Admin session expiry | **Role-based**: 6 hours for admins, 7 days for regular users (existing behavior preserved) |
| 13 | Cookie scope | Per-subdomain isolated |
| 14 | BFF rate limit | Split admin rate limit by auth header: 10/min for `X-Admin-Key`, 300/min per-session for `Bearer`, 5/min for `/bootstrap` |
| 15 | Migration mechanism | Continue appending idempotent DDL to embedded `internal/store/schema.sql` (existing pattern); no separate migration runner |
| 16 | `credits_charged` plumbing | Settle functions return `(actualCost, err)` to caller; caller passes cost to both `SettleHold` and the async usage writer. **Historical rows**: `NOT NULL DEFAULT 0` (no backfill; pre-PR-1 rows contribute $0 to aggregates — accurate since no cost data exists for them). |
| 17 | Auth token location | Backend session token lives **only** in the encrypted JWT via the `jwt` callback. The `session` callback strips it before returning to client APIs. BFF proxy reads it via `getToken()` (server-only), never via `auth()`/`useSession()`. |
| 18 | Rate-limit cap timing | 10,000 rpm cap helper applied in **PR 0** to all existing create/update paths (`admin.go createKey`, user-side key creation, admin `createAccountKey`). Not deferred to PR 3. |
| 19 | Admin mutation concurrency | Role changes AND `is_active` transitions on admins both guarded by `pg_advisory_xact_lock(hashtext('admin_mutations'))` inside a transaction. Prevents racing two concurrent mutations to zero active admins. |

---

## Stack

**Backend** (`local-ai-proxy`):
- Go 1.26, stdlib `net/http`, `jackc/pgx/v5`, `prometheus/client_golang`, `golang.org/x/crypto`
- PostgreSQL, k3s, Docker multi-stage, GitHub Actions CI/CD
- Deployed at `ai.kinvee.in/api`

**Frontend** (`local-ai-proxy-admin-frontend`):

Known-good pins at plan time (2026-04-12). Package versions shift fast; **re-audit the full set the week PR A starts** and bump to current stable unless noted otherwise. `next-auth` deliberately stays on `beta` until v5 goes stable (accepted risk; v5 brings clean App Router + Credentials + JWT-session support). Pin with caret ranges (`^x.y.z`) unless noted exact.

| Package | Pinned | Notes |
|---|---|---|
| `next` | `^16.2.3` | App Router, `output: 'standalone'` |
| `react`, `react-dom` | `^19.2.5` | |
| `typescript` | `^6.0.2` | `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` |
| `@chakra-ui/react` | `^3.34.0` | v3 tokens + recipes |
| `@emotion/react` | `^11.14.0` | |
| `next-themes` | `^0.4.6` | Light/dark toggle |
| `@tanstack/react-query` | `^5.99.0` | |
| `@tanstack/react-query-devtools` | `^5.99.0` | dev only |
| `@tanstack/react-table` | `^8.21.3` | |
| `react-hook-form` | `^7.72.1` | |
| `zod` | `^4.3.6` | **v4**, not v3 |
| `@hookform/resolvers` | `^5.2.2` | v5 works with Zod v4 |
| `recharts` | `^3.8.1` | **v3**, breaking changes from v2 — smoke-test in PR F |
| `next-auth` | `5.0.0-beta.30` (exact pin) | Beta; monitor for breaking changes at each upgrade |
| `lucide-react` | `^1.8.0` | Finally stable 1.x |
| `date-fns` | `^4.1.0` | |
| `vitest` | `^4.1.4` | **v4** |
| `@vitest/coverage-v8` | `^4.1.4` | |
| `@vitejs/plugin-react` | `^4.3.4` | |
| `jsdom` | `^25.0.1` | |
| `@testing-library/react` | `^16.1.0` | |
| `@testing-library/jest-dom` | `^6.6.0` | |
| `@testing-library/user-event` | `^14.5.0` | |
| `msw` | `^2.13.2` | |
| `@playwright/test` | `^1.59.1` | |
| `eslint` | `^10.2.0` | v10 flat config |
| `eslint-config-next` | `^16.2.3` | |
| `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser` | `^8.15.0` | |
| `eslint-plugin-react-hooks` | `^5.1.0` | |
| `prettier` | `^3.8.2` | |

Node `>=22.11.0`. npm `>=10`. Deployed at `admin.ai.kinvee.in` on same k3s cluster, `local-ai` namespace.

**Architecture patterns**:
- Always-proxy BFF pattern: browser → Next Route Handler → backend (internal cluster address)
- Isolated per-subdomain session cookies
- Backend admin middleware accepts **two auth paths**: `X-Admin-Key` (scripts, bootstrap, emergency) and `Authorization: Bearer <session_token>` where `user.role='admin'` (human UI via BFF)
- Session token is carried **inside** the encrypted next-auth JWT cookie — never exposed to the browser JS runtime

---

## Design System

Design system is owned by the admin frontend. Implemented as Chakra v3 tokens + recipes + a live `/styleguide` route for review and visual regression snapshots.

### 1. Brand Identity

- **Product name**: `local-ai admin`
- **Tone**: warm data density. Confident, fast, human. References: Flatlogic Light Blue (gradient-glass visual DNA), Linear / Retool (information density). Anti-reference: flat shadcn-gray, consumer SaaS hero gradients.
- **Dual-mode, gradient-canvas**: rich teal→violet gradient for dark; pastel blue→indigo→violet gradient for light. Not "dark mode first" — both modes are equals and neither falls back to flat neutrals.
- **Distinctive through surface, not chrome**: the gradient canvas + translucent glass cards carry the identity. Inside cards, restrained typography and tabular numerals.

### 2. Color Tokens

#### Canvas gradients (per mode)

| Mode | Gradient |
|---|---|
| Dark | `linear-gradient(135deg, #0f2027 0%, #2c5364 50%, #4568dc 100%)` |
| Light | `linear-gradient(135deg, #dbeafe 0%, #c7d2fe 50%, #e9d5ff 100%)` |

The gradient is applied to `<body>` and kept fixed (`background-attachment: fixed`) so scrolling content doesn't drag the gradient.

#### Raw scales (11-step each)

| Scale | Role | Notes |
|---|---|---|
| `slate.50` → `slate.950` | Neutral, slight cool tilt; used behind opaque content and inside light-mode cards | Perceptually even steps |
| `accent.50` → `accent.950` | Indigo accent, midpoint `~hsl(239, 84%, 67%)` i.e. `#4f46e5` | For CTAs, focus rings, badges |
| `success.*` | Muted green, midpoint `~hsl(150, 45%, 45%)` | |
| `warn.*` | Amber, midpoint `~hsl(40, 80%, 55%)` | |
| `danger.*` | Desaturated red, midpoint `~hsl(355, 55%, 55%)` | |

No neon/traffic-light saturation. Everything one notch muted for long admin sessions.

#### Data visualization palette

Shared across both modes (tuned to sit on either gradient with ≥ 3:1 contrast against the mid-gradient color). Colorblind-verified (Deuteranopia + Protanopia). 10 qualitative colors:

```
#60a5fa  #a78bfa  #34d399  #fbbf24  #fb7185
#22d3ee  #f472b6  #4ade80  #f59e0b  #818cf8
```

Defined once in `src/theme/dataViz.ts`, reused by all charts. Sequential and diverging scales for heatmaps/deltas are derived from the accent scale plus a teal anchor.

#### Semantic tokens

| Token | Dark (over V2 gradient) | Light (over V5 gradient) | Use |
|---|---|---|---|
| `bg.canvas` | V2 gradient | V5 gradient | `<body>`; never a flat color |
| `bg.glass.sidebar` | `rgba(255,255,255,0.06)` | `rgba(255,255,255,0.50)` | Sidebar panel |
| `bg.glass.subtle` | `rgba(255,255,255,0.05)` | `rgba(255,255,255,0.70)` | Table row hover, nested panels |
| `bg.glass.surface` | `rgba(255,255,255,0.10)` | `rgba(255,255,255,0.88)` | Default cards, inputs |
| `bg.glass.elevated` | `rgba(255,255,255,0.18)` | `rgba(255,255,255,0.95)` | Dialogs, popovers, menus |
| `bg.glass.opaque` (fallback) | `#1a1f3a` | `#ffffff` | Used via `@supports not (backdrop-filter)` |
| `fg.default` | `rgba(255,255,255,0.94)` | `rgba(15,23,42,0.92)` | Primary text |
| `fg.muted` | `rgba(255,255,255,0.68)` | `rgba(15,23,42,0.65)` | Secondary text, labels |
| `fg.subtle` | `rgba(255,255,255,0.45)` | `rgba(15,23,42,0.45)` | Captions, timestamps |
| `fg.onAccent` | `#ffffff` | `#ffffff` | Text on accent fills |
| `border.glass` | `rgba(255,255,255,0.18)` | `rgba(15,23,42,0.08)` | Glass card outline |
| `border.subtle` | `rgba(255,255,255,0.10)` | `rgba(15,23,42,0.05)` | Table row dividers |
| `border.focus` | `accent.300` (`#a5b4fc`) | `accent.500` (`#6366f1`) | Focus rings |
| `accent.solid` | `linear-gradient(135deg, #4f46e5, #7c3aed)` | `linear-gradient(135deg, #4f46e5, #7c3aed)` | Primary CTAs |
| `accent.muted` | `rgba(79,70,229,0.22)` | `rgba(79,70,229,0.12)` | Badge backgrounds |
| `accent.emphasis` | `#a5b4fc` | `#4338ca` | Hover text on accent-muted |

Light mode uses solid-white cards with very high opacity (88/95%) because translucent white glass over a light gradient doesn't provide enough contrast. Dark mode leans into low-opacity glass (8/10/18%) where the blur does the heavy lifting.

### 3. Typography

| Family | Use |
|---|---|
| **Inter** | UI sans, variable font, tabular numerals always-on |
| **JetBrains Mono** | API keys, IDs, timestamps, raw JSON, code blocks |

Both self-hosted via `next/font` (no external CDN).

| Role | Size/line | Weight | Use |
|---|---|---|---|
| `display` | 32/40 | 700 | Rare, landing headers |
| `heading.lg` | 24/32 | 600 | Page titles |
| `heading.md` | 20/28 | 600 | Card titles |
| `heading.sm` | 16/24 | 600 | Section labels |
| `body.lg` | 16/24 | 400 | Prominent prose |
| `body.md` | 14/20 | 400 | Default body |
| `body.sm` | 13/18 | 400 | Table cells, dense text |
| `caption` | 12/16 | 500 | Meta, form labels |
| `code.md` | 14/20 | 400 | Inline code, IDs |
| `code.sm` | 13/18 | 400 | Dense code |

Global: `font-feature-settings: 'tnum' 1, 'cv11' 1;` for tabular numerals + friendlier Inter character variants. Letter-spacing tightened by `-0.01em` on `display` and `heading.lg` only.

### 4. Spacing

4px base. Scale: `0, 0.5 (2), 1 (4), 1.5 (6), 2 (8), 3 (12), 4 (16), 5 (20), 6 (24), 8 (32), 10 (40), 12 (48), 16 (64), 20 (80), 24 (96)`.

Rhythm rules:
- Card internal padding: 4 (16px) compact, 6 (24px) comfortable
- Section spacing: 8 (32px) between cards
- Form row spacing: 4 (16px) between fields
- Table row height: 32px (dense), 40px (default), 48px (comfortable)

### 5. Radii

Bumped relative to flat designs — glass reads better with a little more curvature.

| Token | Value | Use |
|---|---|---|
| `none` | 0 | — |
| `sm` | 4px | Badges, inline tags |
| `md` | 10px | Buttons, inputs, small cards |
| `lg` | 14px | Default cards, panels |
| `xl` | 20px | Dialogs, hero surfaces |
| `full` | 9999 | Pills, avatars |

### 6. Glass Surfaces & Elevation

Glass is the primary surface language. Four tiers, each mapped to a semantic token:

| Tier | Blur | Dark opacity | Light opacity | Use |
|---|---|---|---|---|
| `glass.subtle` | 10px | 5% white | 70% white | Row hover, nested blocks |
| `glass.surface` | 18px | 10% white | 88% white | Default cards |
| `glass.elevated` | 24px | 18% white | 95% white | Dialogs, popovers, menus |
| `glass.sidebar` | 14px | 6% white | 50% white | Sidebar panel |

All glass uses `backdrop-filter: blur(X) saturate(1.2);` with the matching `-webkit-backdrop-filter`. Feature fallback:

```css
@supports not (backdrop-filter: blur(1px)) {
  .glass-surface { background: var(--bg-glass-opaque); }
}
```

Shadows sit on top of glass, not inside:

| Token | Dark | Light |
|---|---|---|
| `e0` | inset 0 1px 0 `rgba(255,255,255,0.08)`, 0 1px 2px `rgba(15,23,42,0.2)` | 0 1px 2px `rgba(15,23,42,0.05)` |
| `e1` | `e0` + 0 4px 12px `rgba(15,23,42,0.25)` | 0 4px 12px `rgba(15,23,42,0.08)` |
| `e2` | `e0` + 0 8px 24px `rgba(15,23,42,0.35)` | 0 8px 24px `rgba(15,23,42,0.12)` |
| `e3` | `e0` + 0 16px 48px `rgba(15,23,42,0.45)` | 0 16px 48px `rgba(15,23,42,0.18)` |

Usage: `e0` = cards (default), `e1` = hover lift, `e2` = dropdowns/popovers, `e3` = dialogs.

### 7. Motion & Animations

Motion is a first-class part of the system. All tokens live in `src/theme/animations.ts` and map to Chakra v3 transition tokens plus CSS `@keyframes` for the complex cases.

**Global principles**:
- `prefers-reduced-motion: reduce` → disable all `transform` animations; keep opacity-only transitions ≤ 200ms.
- Prefer `transform` + `opacity` over layout properties for 60fps.
- No motion longer than 360ms — anything slower feels sluggish in an admin tool.

**Tokens**:

| Token | Value |
|---|---|
| `duration.xs` | 80ms |
| `duration.sm` | 140ms |
| `duration.md` | 220ms |
| `duration.lg` | 320ms |
| `ease.standard` | `cubic-bezier(0.2, 0, 0, 1)` |
| `ease.emphasized` | `cubic-bezier(0.3, 0, 0.1, 1)` |
| `ease.decelerate` | `cubic-bezier(0, 0, 0.1, 1)` |
| `ease.accelerate` | `cubic-bezier(0.3, 0, 1, 1)` |

**Named animations** (exported from `animations.ts` as keyframe + preset-props pairs):

| Name | Trigger | Spec |
|---|---|---|
| `fade` | Route mount, content reveal | `opacity 0→1`, 220ms, `ease.standard` |
| `rise` | Card/panel mount | `opacity 0→1` + `translateY(8px → 0)`, 220ms, `ease.decelerate` |
| `pop` | Toast, popover, menu enter | `opacity 0→1` + `scale(0.96 → 1)`, 180ms, `ease.emphasized` |
| `slideIn` | Dialog, drawer | `opacity 0→1` + `translateY(24px → 0)`, 320ms, `ease.emphasized` |
| `shimmer` | Skeleton loading | diagonal gradient sweep across element, 1400ms infinite linear |
| `pulse` | Subtle attention (health dot warn) | `opacity 0.6 → 1 → 0.6`, 2000ms `ease-in-out` infinite |
| `countUp` | `StatCard` value on mount | numeric interpolation 0 → target, 600ms `ease-out` |
| `press` | Button active | `scale(1 → 0.98)`, 80ms, `ease.standard` |
| `lift` | Card hover | `translateY(0 → -2px)` + shadow `e0 → e1`, 140ms, `ease.standard` |

**List stagger**: mounting a list (table rows, nav items, card grids) staggers children at 40ms increments, capped at 10 children to prevent slow-feel on long lists.

**Route transitions**: `(admin)/layout.tsx` wraps `{children}` in a `fade`-keyed container keyed by pathname. 220ms fade, no translate — keeps the gradient canvas steady between routes.

**Number transitions**: `StatCard.value` uses `countUp` on mount and animates on value change via `requestAnimationFrame`-based interpolation (utility in `src/lib/utils/countUp.ts`).

### 8. Loading Templates (Skeletons)

Every data-bound surface has a matching skeleton. Skeletons use the `shimmer` animation over `glass.subtle` and live under `src/components/loading/`.

**Principles**:
- Skeleton shape matches real shape — no layout shift on swap.
- Minimum display time: **120ms** (prevents flash on fast loads; wrapped via a `useMinDuration` hook).
- After **8s** of continued skeleton display, swap to a secondary hint ("Still loading…").
- Skeletons accept an `animate` prop; Playwright visual regression disables animation for deterministic screenshots.
- No global spinners. The only spinner is the 16px inline spinner inside buttons during mutations.

**Catalog** (`src/components/loading/`):

| Component | Shape | Props |
|---|---|---|
| `StatCardSkeleton` | card + 3 shimmer bars (label / value / delta) | — |
| `DataTableSkeleton` | header row + N body rows × 4–6 shimmer cells | `rows` (default 5), `columns` (default 4) |
| `ChartSkeleton` | card + dimmed gridlines + curved shimmer line | `height` (default 240) |
| `FormSkeleton` | N rows of (label bar + input bar) | `fields` (default 6) |
| `TextBlockSkeleton` | 3 bars at 100% / 85% / 60% width | `lines` (default 3) |
| `PageSkeleton` | AdminShell shell + breadcrumb shimmer + `children` slot | composes other skeletons |
| `DialogSkeleton` | TextBlockSkeleton + button-row bars | — |
| `AvatarSkeleton` | 32px circle shimmer | `size` (default 32) |
| `PillSkeleton` | 20px pill shimmer | `width` (default 64) |

Every list/table query hook (`useKeys`, `useUsers`, etc.) pairs with a skeleton in the corresponding page, chosen by React Query's `status === 'pending'`. Errors render the page's `error.tsx` route boundary, not a skeleton.

### 9. Breakpoints & Responsive Strategy

Chakra defaults: `sm 480 / md 768 / lg 992 / xl 1280 / 2xl 1536`.

Admin is desktop-first. Below `lg`:
- Sidebar collapses to a drawer (hamburger icon in TopBar).
- `DataTable` adapts: primary column + key metadata on card rows.
- Multi-column layouts stack.
- Charts reduce detail (hide axes, simplify tooltips).
- Glass opacity bumps up by ~4 points on mobile to compensate for smaller viewport blur artifacts.

Target: 1280+ screens. Mobile functional but not polished.

### 10. Component Specs

#### 10.1 Button

| Variant | Appearance |
|---|---|
| `solid` | `accent.solid` gradient fill, `fg.onAccent` text, `e1` shadow |
| `subtle` | `bg.glass.subtle`, `fg.default` text |
| `ghost` | transparent; hover → `bg.glass.subtle` |
| `outline` | 1px `border.glass`, hover → `bg.glass.subtle` |

Tones: `accent` (default), `neutral`, `danger`. `danger` swaps to `danger.*` scale.
Sizes: `xs` (24), `sm` (28), `md` (36), `lg` (44).
States: `press` animation on `:active`; focus shows 2px accent ring + 2px offset.

#### 10.2 Form Fields

- `Input`, `Select`, `Textarea` all 36px (md size).
- Background `bg.glass.surface`; border `border.glass`; focus → 2px accent ring + `border.focus`.
- Error: `border.danger` + message below in `danger.fg`.
- Disabled: opacity 0.5, `cursor: not-allowed`.
- Labels: `caption` size, uppercase tracking, above field.
- Help text: `caption` size, `fg.muted`, below field.

#### 10.3 DataTable

- Card container uses `glass.surface`.
- Sticky header row uses `glass.elevated` to stand out on scroll.
- Row height: 40px default, 32px dense, 48px comfortable (user-toggleable, persisted to localStorage).
- Row hover: `glass.subtle`.
- Row actions: three-dot menu on right, revealed on hover, always visible on touch.
- Sortable column: subtle chevron, default unsorted.
- Loading: swap in `DataTableSkeleton`.
- Empty: icon + "No [thing] yet" + CTA, rendered inside the table body.
- Pagination: bottom row — "Showing N–M of T" left, `Prev` / `Next` + page-size select right.

#### 10.4 Cards / Panels

- Default: `glass.surface`, radius `lg`, 1px `border.glass`, `e0` shadow.
- Interactive: cursor + `lift` animation on hover, `border.focus` on focus.
- Header: `heading.sm` + optional action button row.
- Footer (optional): `border.subtle` top border, right-aligned buttons.

#### 10.5 AdminShell (App Layout)

- **TopBar** (56px, `glass.elevated`): logo (left), breadcrumbs (center, optional), search trigger + health dot + theme toggle + user avatar menu (right). Floats over the gradient.
- **SideNav** (240px expanded / 64px collapsed, `glass.sidebar`): app switcher (future), section groups with caption headers, nav items with icon + label + active indicator (2px accent bar on left + `accent.muted` fill + `lift` on hover).
- **Main**: transparent (gradient canvas shows through), max-width 1600px, 24px horizontal padding, 32px top padding.
- **Persistent status strip** (bottom, 32px, `glass.elevated`): environment badge, backend version, build info — only in non-prod or when `?debug=1`.

#### 10.6 Dialogs

- Surface: `glass.elevated`, radius `xl`, `e3` shadow.
- Max widths: 540 (confirm), 720 (form), 960 (detail).
- Backdrop: `rgba(15,23,42,0.55)` dark, `rgba(15,23,42,0.30)` light, with `backdrop-filter: blur(6px)`.
- Entrance: `slideIn`. Exit: reverse `slideIn` accelerated (180ms, `ease.accelerate`).
- Primary action right, cancel left, destructive action uses `danger` button.
- Close on Escape, backdrop click (configurable).

#### 10.7 Toasts

- Bottom-right stack, max 3 visible.
- Surface: `glass.elevated`, radius `md`.
- Entrance: `pop`. Exit: reverse `pop` 140ms.
- Auto-dismiss: 4s success, 5s info, 6s warn, manual for danger.
- Shape: icon · title (bold) · description (muted, optional) · action (optional) · close (X).
- Always include `request_id` as secondary line for server errors.

#### 10.8 OneTimeSecretDialog

Purpose-built for admin keys + registration tokens returned once by backend:
- Large mono display of the secret, full-width, with copy button.
- Warning banner (warn tone): "This value is shown only once. Store it securely."
- No backdrop close, no Escape close — only explicit "I've copied this" button dismisses.
- Copy action disables dismiss button for 500ms to prevent accidental dismissal.

#### 10.9 Charts (recharts)

- Grid: `border.subtle` at 1px.
- Axes: `fg.subtle` labels, `caption` size.
- Tooltips: `glass.elevated`, `e2` shadow, radius `md`, tabular numerals.
- Data colors from `dataViz.ts` palette, never UI semantic colors.
- Loading: `ChartSkeleton`.
- Empty/no-data state: centered icon + "No data in this window."
- Axis line animation on mount: `fade` only (no growing bars — feels toy-ish in an admin tool).

#### 10.10 Badges / Tags / Status Pills

- 20px height, `caption` size, `radius.sm`.
- Backgrounds from muted tone scales (`accent.muted`, `success.muted`, etc.).
- Roles: `status` (active/revoked/pending), `type` (admin/user/service), `tag` (user-defined).

### 11. Accessibility

- Contrast: all text ≥ 4.5:1 (WCAG AA) verified against both gradient endpoints and mid-point. Interactive elements ≥ 3:1.
- Glass surfaces tested for contrast at every opacity value defined above. No token ships without passing.
- Focus: always visible. 2px accent ring, 2px offset. No `outline: none` anywhere.
- Keyboard: every action reachable. `Esc` closes dialogs, `Tab` cycles, `Enter` submits primary.
- Screen readers: every icon button has `aria-label`. Form fields always have real `<label>`. Status icons paired with text (never color-only).
- Motion: `prefers-reduced-motion: reduce` removes transforms and disables `shimmer`/`pulse`; keeps opacity transitions under 200ms.
- Axe audit in Playwright on every page per PR.

### 12. Iconography

- Library: `lucide-react`. 1.5px stroke, geometric style.
- Sizes: 14 (inline with body.sm), 16 (default inline), 20 (standalone), 24 (prominent), 48 (empty states).
- Color: inherit from parent text by default. Semantic icons (check, alert, x) use role colors.

### 13. Copy / Voice

- Terse and specific. "No keys yet" not "You have not created any API keys at this time."
- Destructive confirms state the consequence: "Revoke key 'prod-ci'? This cannot be undone."
- Errors: user-readable message + request ID (small, muted) for support tickets.
- Numbers: right-aligned in tables, tabular figures, thousands separators.
- Currency: `$1,234.56` (no currency code, single-currency product).
- Timestamps: relative in tables ("3m ago"), absolute on hover + in detail views (`2026-04-12 10:24 UTC`).
- Booleans in tables: `✓` / `—`, never `true` / `false`.

### 14. Implementation Structure

```
src/theme/
├── index.ts             # createSystem, exports
├── tokens.ts            # raw palette, fonts, spacing, radii
├── semanticTokens.ts    # semantic mapping per mode (glass tiers, fg/bg/border)
├── gradients.ts         # canvas gradient strings (dark / light)
├── animations.ts        # keyframes, durations, easings, named presets
├── recipes/
│   ├── button.ts
│   ├── input.ts
│   ├── card.ts          # glass recipe primary
│   ├── badge.ts
│   ├── dialog.ts
│   └── table.ts
├── globalCss.ts         # font-feature, reduce-motion, body gradient, scrollbar
└── dataViz.ts           # chart palette + recharts theme object

src/components/loading/
├── StatCardSkeleton.tsx
├── DataTableSkeleton.tsx
├── ChartSkeleton.tsx
├── FormSkeleton.tsx
├── TextBlockSkeleton.tsx
├── PageSkeleton.tsx
├── DialogSkeleton.tsx
├── AvatarSkeleton.tsx
└── PillSkeleton.tsx

src/lib/utils/
├── countUp.ts           # RAF-based number interpolation for StatCard
└── useMinDuration.ts    # hook enforcing skeleton min-display 120ms
```

### 15. Living Style Guide

Route `/styleguide` renders every component in every variant, in both gradient modes via a theme toggle at the top. Purposes:
1. **Design review** — pixel-perfect reference for the team
2. **Regression catch** — Playwright full-page screenshots per theme (dark + light) in CI
3. **Living documentation** — devs add new components here first

**Gating**:
- **FE PR A3**: public (auth doesn't exist yet), with `X-Robots-Tag: noindex, nofollow` and `<meta name="robots" content="noindex,nofollow">` to prevent indexing.
- **PR B onward**: auth-gated alongside every other admin route via `middleware.ts`.

**Sections**: Colors (both modes) · Gradients · Typography · Spacing · Glass tiers · Radii · Motion (each named animation interactive) · Buttons · Inputs · Tables · Cards · Dialogs · Toasts · Charts · Badges · Empty states · Forms · **Skeletons** (every skeleton above, toggle animate on/off).

### 16. Delivery

Design system ships across **Frontend PR A2 and A3**:
- **A2**: full `src/theme/*` (tokens, semantic, gradients, animations, recipes) + Chakra provider wiring + next-font Inter/JetBrains Mono + light/dark toggle via `next-themes` + `src/components/loading/*` skeleton catalog.
- **A3**: `/styleguide` route rendering every variant + Playwright visual regression (dark + light) + noindex.

All tokens, recipes, skeletons, and animations land before **PR C** (first feature PR) begins. Feature PRs consume the system — they don't invent new styles.

## Backend PR Sequence

**Status (2026-04-15):** BE 0–7 all shipped. Backend sequence is complete.

| PR | Scope | Key Changes |
|---|---|---|
| **0** ✅ | Admin session auth + BFF rate-limit split + bootstrap + rate-limit cap | See **PR 0 detailed spec** below. Extend `/api/auth/login` to return user role. Admin middleware accepts both `X-Admin-Key` and `Authorization: Bearer <session_token>` where `user.role='admin'`. **Split admin rate limit by auth header** (10/min X-Admin-Key, 300/min per-session Bearer, 5/min bootstrap). **Role-based session duration** (6h admin, 7d user, unchanged for non-admins). `POST /api/admin/bootstrap` mounted **outside** admin auth middleware, **reusable** (no one-shot marker). Create `registration_events` table (audit sink — bootstrap writes to it). Deactivation endpoint (`PUT /api/admin/users/{id}/deactivate`) gains the `pg_advisory_xact_lock` + last-active-admin guardrail. Rate-limit cap (reject `> 10000`; preserve existing `<= 0 → 60` default) applied to all key create/update paths. |
| **1** ✅ | Store layer + schema additions | See **Schema Changes** and **Analytics SQL** sections below. Adds: `UsageFilter` + analytics methods (`GetUsageSummary`, `ByModel`, `ByUser`, `Timeseries`); `CreditsCharged` field on `UsageEntry` (additive only, existing `int` token fields unchanged); three new indexes; `credits_charged` column on `usage_logs` populated via proxy→async-writer plumbing; **`registration_events` backfills** (the table itself was created in PR 0) from existing `users`/`accounts`; new registration-event writers in user signup + service registration paths; ldflags wiring in Dockerfile (`-X main.version=$GIT_SHA`, CI passes `--build-arg GIT_SHA=${SHORT_SHA}`). No HTTP changes in this PR. |
| **2** ✅ | HTTP: analytics endpoints | `GET /api/admin/usage/{summary,by-model,by-user,timeseries}`. Pagination envelope helper (`{data, pagination}`). New endpoints always return enveloped responses. |
| **3** ✅ | HTTP: detail + mutations | `GET /api/admin/users/{id}`, `PUT /api/admin/users/{id}/role` (**transaction + `pg_advisory_xact_lock` guardrail**, same pattern as PR 0's deactivation). `GET /api/admin/keys/{id}`, `PUT /api/admin/keys/{id}/rate-limit` (reuses cap helper from PR 0). `GET /api/admin/registrations` reads from the `registration_events` table (created PR 0, backfilled PR 1). |
| **4** ✅ | Pagination rollout (opt-in) | Opt-in `?envelope=1` on existing list endpoints: `/api/admin/keys`, `/api/admin/users`, `/api/admin/accounts`, `/api/admin/pricing`, `/api/admin/registration-tokens`, `/api/admin/usage`. Filters: `role`, `is_active`, `type`. **No `q` parameter** (deferred per locked decision #6). |
| **5** ✅ | Config + health | `GET /api/admin/config` (whitelisted snapshot, never secrets). `GET /api/admin/health` returns minimal `{status, checks: {db, ollama, usage_writer}, uptime_seconds, version}` — **pool stats go to Prometheus only, not here**. |
| **6** ✅ | Prometheus metrics expansion | Full `pgxpool.Stat` exposure (total, acquired, idle, max, acquire_count, acquire_duration, new_conns, lifetime_destroys, idle_destroys, constructing). Plus previously P1-marked metrics (body size histograms, sweeper counters, registration counters, admin auth failures). |
| **7** ✅ | Envelope default flip | Remove opt-in, envelope becomes the default on all list endpoints. `?envelope=0` returns legacy shape for one release cycle as a safety valve for any ad-hoc `X-Admin-Key` scripts. Ships once FE D is merged + CI-green; no prod bake required (single-operator project). |

### PR 0 Detailed Spec

**Backend auth changes** (`internal/admin/admin.go`, `internal/user/middleware.go`, `internal/user/handler.go`):

1. **Admin middleware accepts two auth paths**. Current middleware (line 91-112) rejects anything other than `X-Admin-Key`. Rewrite to:
   ```go
   // Pseudocode
   if hasHeader("X-Admin-Key") {
     if constantTimeEq(provided, cfg.AdminKey) {
       if !adminKeyBucket.Allow() { return 429 }
       next.ServeHTTP(...); return
     }
     return 401
   }
   if hasBearer := extractBearer(r); hasBearer != "" {
     session := db.GetSessionByTokenHash(hashKey(hasBearer))
     if session == nil || session.expired() { return 401 }
     user := db.GetUserByID(session.UserID)
     if user == nil || !user.IsActive || user.Role != "admin" { return 403 }
     if !perSessionBucket(hashKey(hasBearer)).Allow() { return 429 }
     ctx = context.WithValue(ctx, adminSessionKey{}, session)
     next.ServeHTTP(w, r.WithContext(ctx)); return
   }
   return 401
   ```

2. **Two rate-limit buckets**:
   - `adminKeyBucket`: single shared 10 req/min bucket (current behavior, unchanged).
   - `perSessionBuckets`: `sync.Map[token_hash]*bucket`, each bucket 300 req/min (5 req/sec refill). Pruner goroutine removes entries inactive >10min (reuse pattern from `internal/ratelimit/ratelimit.go`).

3. **Role-based session duration** (`internal/user/middleware.go`):
   ```go
   const (
       userSessionDuration  = 7 * 24 * time.Hour
       adminSessionDuration = 6 * time.Hour
   )
   func sessionDurationFor(role string) time.Duration {
       if role == "admin" { return adminSessionDuration }
       return userSessionDuration
   }
   ```
   `handler.go:191` uses this based on the authenticated user's role. Non-admin sessions unaffected.

4. **Login response includes role** so the frontend knows what it's dealing with:
   ```json
   {"token": "<raw>", "expires_in": 21600, "user": {"id": 1, "email": "...", "role": "admin"}}
   ```

5. **Rate-limit cap helper** (`internal/admin/ratelimit.go` or an apierror helper): single `applyRateLimitDefaultsAndCap(n int) (int, error)` that preserves the existing compatibility behavior AND enforces the new ceiling:
   ```go
   func applyRateLimitDefaultsAndCap(n int) (int, error) {
       if n <= 0 { return 60, nil }       // preserve "omitted or zero → default 60"
       if n > 10000 { return 0, ErrRateLimitTooHigh }
       return n, nil
   }
   ```
   **Why preserve the `<= 0` default**: existing clients that omit `rate_limit` in their JSON body decode to `0` in the request struct, which `admin.go:140` and `user/handler.go:577` treat as "use 60". Rejecting 0 would be a silent API break. The cap policy's goal is blocking typo'd high values, not changing omission semantics.

   Wired into ALL create/update code paths in this PR:
   - `admin.go createKey` (line ~130) — replace the existing `if req.RateLimit <= 0 { req.RateLimit = 60 }` with a call to the helper
   - `admin.go createAccountKey` (line ~73)
   - user-side key creation in `internal/user/handler.go:577`
   - (PR 3 reuses this helper for `PUT /admin/keys/{id}/rate-limit`, where `<= 0` should probably be rejected since it's an explicit update — handle that as an explicit branch in PR 3)

6. **Bootstrap endpoint** (`internal/bootstrap/handler.go`, new package) — **reusable** design:
   - `POST /api/admin/bootstrap` — mounted in `cmd/proxy/main.go` **before** the admin mux prefix so Go's `ServeMux` routes it exactly:
     ```go
     mux.Handle("POST /api/admin/bootstrap", bootstrap.New(db, cfg.AdminBootstrapToken))
     mux.Handle("/api/admin/", adminHandler) // existing authMiddleware chain
     ```
   - Independent 5 req/min rate-limit bucket.
   - Reads `ADMIN_BOOTSTRAP_TOKEN` at startup; returns 404 if env var empty/unset — protects against accidental exposure when not actively bootstrapping.
   - Accepts `{token, email, password, name}`; constant-time compare on token.
   - On valid token: bcrypt password, insert `users` row with `role='admin'`, `is_active=TRUE`. Returns `201 {id, email}`.
   - On duplicate email (unique constraint violation): returns `409 email_exists`.
   - **Reusable**: no one-shot DB marker. Each successful call creates another admin user.
   - Operational discipline:
     - Operator sets `ADMIN_BOOTSTRAP_TOKEN` in GitHub Actions secrets when needed, unsets after use.
     - Rotate the token between uses; old token stops working the moment the new pod picks up the new env var.
     - This same endpoint handles **disaster recovery** (DR) — no separate recovery path needed.
   - Log every attempt via `slog.InfoContext` with outcome (`success`/`invalid_token`/`rate_limited`/`email_exists`) and email, never the raw token.
   - **Audit trail**: insert into `registration_events` with `source='admin_bootstrap'` in the same transaction as the user insert (see Schema Changes below).

7. **Tests** (`internal/admin/admin_test.go`, new `internal/bootstrap/handler_test.go`):
   - Admin middleware: X-Admin-Key path (happy, wrong key, rate limit).
   - Admin middleware: Bearer path (happy admin, non-admin role → 403, expired session → 401, rate limit per session).
   - Mixed: both headers present → X-Admin-Key takes precedence.
   - Bootstrap: env unset → 404; wrong token → 401; correct token → 201 + user created; second call with rotated token → 201 (reusable); duplicate email → 409; malformed body → 400; rate limit after 5 rapid calls → 429.
   - Rate-limit cap: `POST /api/admin/keys` with `rate_limit=10001` → 400; with `rate_limit=0` → 201 and stored value is 60 (preserves existing default-on-omission behavior); with `rate_limit=60` → 201; omitted field → 201 with stored value 60.
   - Role-based expiry: admin login → session.expires_at 6h out; user login → 7d out.
   - Admin mutation locking: two concurrent role-change/deactivation requests serialize via the advisory lock; final state is consistent (no "both last admins demoted").

### Schema Changes (applied via `internal/store/schema.sql` appends)

The app executes the embedded `schema.sql` at startup (`internal/store/store.go:13-14, 173-178`); `migrations/` directory is dormant. New DDL gets appended to `schema.sql` using the existing idempotent patterns (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `DO $$ ALTER TABLE ... ADD COLUMN ... EXCEPTION WHEN duplicate_column THEN NULL; END $$`). Delete or README-annotate `migrations/` to avoid confusion.

**PR 0 appends** — creates `registration_events` so bootstrap audit can write into it from day one (a SQL insert into a non-existent table aborts the transaction, not a no-op):

```sql
-- Registration audit trail. Source values (at time of writing):
--   'public_signup'        — new user via POST /api/auth/register
--   'registration_token'   — service account via POST /api/accounts/register
--   'admin_bootstrap'      — first admin or DR admin via /api/admin/bootstrap
--   'admin_create'         — admin-created user via POST /api/admin/users (future)
--   'backfill'             — rows inserted by the PR 1 backfill for historical data
-- The column is TEXT (not an enum) so new sources don't require a migration.
CREATE TABLE IF NOT EXISTS registration_events (
    id                      BIGSERIAL PRIMARY KEY,
    kind                    TEXT NOT NULL,               -- 'user' | 'service'
    account_id              BIGINT REFERENCES accounts(id),
    user_id                 BIGINT REFERENCES users(id),
    registration_token_id   BIGINT REFERENCES registration_tokens(id),
    source                  TEXT NOT NULL,
    metadata                JSONB,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_registration_events_created
    ON registration_events(created_at);
```

No `settings` table — bootstrap is reusable (locked decision #11). Bootstrap uses are audited via `registration_events` rows with `source='admin_bootstrap'`.

**PR 1 appends** (table creation already done in PR 0):
```sql
-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_usage_logs_model_created
    ON usage_logs(model, created_at);
CREATE INDEX IF NOT EXISTS idx_api_keys_account_id
    ON api_keys(account_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id
    ON api_keys(user_id);

-- Credits column on usage_logs (historical rows default 0 per locked decision #16)
DO $$ BEGIN
    ALTER TABLE usage_logs ADD COLUMN credits_charged DECIMAL(15,6) NOT NULL DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Backfill historical registrations (idempotent via WHERE NOT EXISTS)
INSERT INTO registration_events (kind, account_id, user_id, source, created_at)
SELECT 'user', u.account_id, u.id, 'backfill', u.created_at FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM registration_events e WHERE e.user_id = u.id AND e.kind = 'user'
);
INSERT INTO registration_events (kind, account_id, source, created_at)
SELECT 'service', a.id, 'backfill', a.created_at FROM accounts a
WHERE a.type = 'service'
  AND NOT EXISTS (
    SELECT 1 FROM registration_events e WHERE e.account_id = a.id AND e.kind = 'service'
);
```

New registration-event writes live in the transactions that actually create the user/account row (not in admin.go, which only manages tokens, not consumption):
- **User signup** — `internal/user/handler.go` register flow: insert with `source='public_signup'` in the same transaction as the `users` row insert.
- **Service account registration via token** — `internal/user/handler.go` (`POST /api/accounts/register`) or the store function it calls: insert with `source='registration_token'` + `registration_token_id` set in the same transaction that creates the `accounts` row and increments `registration_tokens.uses`.
- **Admin bootstrap** — `internal/bootstrap/handler.go`: insert with `source='admin_bootstrap'` in the same transaction as the admin user insert.
- **Admin-created users** (when `POST /api/admin/users` lands, future PR): `source='admin_create'`.

### Credits Charged Plumbing (PR 1)

Current flow can't populate `credits_charged` because:
- `credits.go:155-194` settle path updates `credit_holds` + `credit_transactions`, not `usage_logs`.
- `proxy.go:473-491` enqueues `UsageEntry` with no cost or hold ID.
- Settle and logUsage execute in sequence in the outer handler, but today no value flows from settle to logUsage.

**Fix** (change these files in PR 1):

1. `internal/store/store.go` — extend `UsageEntry` **additively** (existing field types preserved; only the new field is added):
   ```go
   type UsageEntry struct {
       APIKeyID         int64
       Model            string
       PromptTokens     int        // unchanged
       CompletionTokens int        // unchanged
       TotalTokens      int        // unchanged
       DurationMs       int64
       Status           string
       CreditsCharged   float64    // NEW; 0 when no hold/pricing was active
   }
   ```
   No retype of token fields — that would churn proxy code and every test for no reason.
2. `internal/store/store.go:248` — `LogUsage` INSERT adds `credits_charged`.
3. **Change settle function signatures to return `actualCost`**:
   ```go
   // internal/proxy/proxy.go
   func (h *handler) settleCredits(...) (actualCost float64)
   func (h *handler) settleStreamCredits(...) (actualCost float64)
   ```
   Each function computes `actualCost` (already does internally), calls `h.db.SettleHold(holdID, actualCost)`, then **returns** the cost. For error-with-zero-bytes paths that call `ReleaseHold`, return `0`. For requests on legacy keys without an account/pricing (pricing lookup returned nil), return `0`.
4. **Outer handlers** (the non-streaming and streaming code paths in `proxy.go`) capture the returned cost and pass it to `logUsage`:
   ```go
   actualCost := h.settleStreamCredits(holdID, key, ud, bytesWritten, status, pricing)
   h.logUsage(key, ud, duration, status, actualCost)
   ```
5. `logUsage` gains a trailing `actualCost float64` parameter, assigns `CreditsCharged: actualCost` on the `UsageEntry`.
6. For requests that never entered the credit system (no hold created — legacy keys without accounts), the outer handler passes `0` directly.

Historical rows: column is `NOT NULL DEFAULT 0` (per locked decision #16). No backfill. Pre-PR-1 rows contribute `$0` to analytics aggregates — accurate since no cost data exists for them. Documented limitation: "credit metrics for date ranges extending before PR 1 are lower-bound estimates."

### Analytics SQL + EXPLAIN targets (PR 1)

Each analytics method ships with its exact SQL and an `EXPLAIN (ANALYZE, BUFFERS)` plan captured on a seeded 100k-row test dataset in the PR description. Expected planner behavior:

All four methods use consistent aliases to avoid collisions: `ul` = `usage_logs`, `k` = `api_keys`, `usr` = `users`.

**`GetUsageSummary(f UsageFilter)`** — no grouping, one aggregate row:
```sql
SELECT
  COUNT(*)                                 AS requests,
  COALESCE(SUM(ul.prompt_tokens), 0)       AS prompt,
  COALESCE(SUM(ul.completion_tokens), 0)   AS completion,
  COALESCE(SUM(ul.total_tokens), 0)        AS total,
  COALESCE(SUM(ul.credits_charged), 0)     AS credits,
  COALESCE(AVG(ul.duration_ms), 0)         AS avg_duration,
  SUM(CASE WHEN ul.status='error' THEN 1 ELSE 0 END) AS errors
FROM usage_logs ul
JOIN api_keys k ON ul.api_key_id = k.id
WHERE <filters from UsageFilter>;
```

**`GetUsageByModel(f UsageFilter)`** — grouped by model:
```sql
SELECT
  ul.model,
  COUNT(*) AS requests,
  COALESCE(SUM(ul.total_tokens), 0)    AS total_tokens,
  COALESCE(SUM(ul.credits_charged), 0) AS credits,
  COALESCE(AVG(ul.duration_ms), 0)     AS avg_duration
FROM usage_logs ul
JOIN api_keys k ON ul.api_key_id = k.id
WHERE <filters from UsageFilter>
GROUP BY ul.model
ORDER BY total_tokens DESC;
```

**`GetUsageByUser(f UsageFilter)`** — grouped by owner; "owner" is a human user for keys with `user_id`, a service account for keys with only `account_id`. Each service account gets its own row (not collapsed into one "service" bucket):
```sql
SELECT
  k.user_id,
  usr.email,
  usr.name,
  k.account_id,
  a.name                                AS account_name,
  a.type                                AS account_type,
  COUNT(*)                              AS requests,
  COALESCE(SUM(ul.total_tokens), 0)     AS total_tokens,
  COALESCE(SUM(ul.credits_charged), 0)  AS credits,
  COUNT(DISTINCT k.id)                  AS key_count
FROM usage_logs ul
JOIN api_keys k ON ul.api_key_id = k.id
LEFT JOIN users usr ON usr.id = k.user_id
LEFT JOIN accounts a ON a.id = k.account_id
WHERE <filters from UsageFilter>
GROUP BY k.user_id, usr.email, usr.name, k.account_id, a.name, a.type
ORDER BY total_tokens DESC;
```

Handler derives an `owner_type` discriminator from the nullable columns and returns:
```ts
type OwnerUsageRow = {
  owner_type: 'user' | 'service' | 'unattributed';  // unattributed = legacy keys without account
  user_id: number | null;
  email: string | null;
  name: string | null;
  account_id: number | null;
  account_name: string | null;
  account_type: 'personal' | 'service' | null;
  requests: number;
  total_tokens: number;
  credits: number;
  key_count: number;
};
```
- `owner_type='user'`: `user_id != null` (typically also has account_id; that's the user's personal account)
- `owner_type='service'`: `user_id = null AND account_id != null` (one row per service account — no collapsing)
- `owner_type='unattributed'`: `user_id = null AND account_id = null` (legacy admin-created keys; historically rare)

The admin "By User" UI renders one row per owner — humans by email, services by account name. Route path stays `/api/admin/usage/by-user`; the name survives because human users are the primary audience, but the response covers both populations.

**`GetUsageTimeseries(f UsageFilter, interval)`** — bucketed; `interval='hour'|'day'`:
```sql
SELECT
  date_trunc($1, ul.created_at)            AS bucket,
  COUNT(*)                                 AS requests,
  COALESCE(SUM(ul.prompt_tokens), 0)       AS prompt,
  COALESCE(SUM(ul.completion_tokens), 0)   AS completion,
  COALESCE(SUM(ul.total_tokens), 0)        AS total,
  COALESCE(SUM(ul.credits_charged), 0)     AS credits,
  SUM(CASE WHEN ul.status='error' THEN 1 ELSE 0 END) AS errors
FROM usage_logs ul
JOIN api_keys k ON ul.api_key_id = k.id
WHERE <filters from UsageFilter>
GROUP BY bucket
ORDER BY bucket;
```
Gap-filling (empty buckets filled with zeros) in the Go handler, not SQL.

**Expected planner behavior by filter combination**:
| Filters | Expected access path |
|---|---|
| `since`/`until` only (broad) | Seq scan on `usage_logs` — **acceptable**; planner correctly chooses when most rows qualify |
| `+ model` | `idx_usage_logs_model_created` range scan |
| `+ account_id` | Nested loop with `idx_api_keys_account_id` on the join side, `idx_usage_logs_created` on the left |
| `+ api_key_id` | `idx_usage_logs_key_created` range scan |
| by-user grouping (time filter only) | planner may HashJoin+SeqScan `api_keys` or NestedLoop with PK — no asserted index |
| by-model grouping with model filter | `idx_usage_logs_model_created` + HashAggregate |

**EXPLAIN assertions** (in PR 1 tests) — scoped to selective-filter cases where index use is known-optimal; broad queries are not asserted:
- `by-model` with `{model='llama3.1:8b'}` → plan must contain `idx_usage_logs_model_created`
- `summary` with `{account_id=X}` → plan must contain `idx_api_keys_account_id`
- `summary` with `{api_key_id=X}` → plan must contain `idx_usage_logs_key_created`

**Deliberately NOT asserted**:
- `by-user` with only a time filter — the query joins `api_keys` by primary key and neither filters nor orders by `user_id`. `idx_api_keys_user_id` doesn't help this plan; the planner may legitimately choose HashJoin + seq scan on `api_keys` (fine while the table is small) or NestedLoop with the PK. Asserting the user_id index here would fail non-deterministically as table sizes shift. When we add a `?user_id=` filter parameter to by-user in a future PR, add an assertion gated on that filter.

No blanket "no Seq Scan" assertion — that would reject valid plans for broad aggregates. The test helper parses `EXPLAIN (FORMAT JSON)` output and searches for the expected `Index Name` in the `Plan` tree, failing only when the named index is absent.

### Config Endpoint Whitelist (PR 5)

Exposed: `ollama_url`, `port`, `log_level`, `max_request_body_bytes`, `default_credit_grant`, `cors_origins`, `admin_rate_limit_per_minute`, `usage_channel_capacity`, `admin_session_duration_hours`, `user_session_duration_hours`, `version`, `build_time`, `go_version`.

**Never exposed**: `admin_key`, `database_url`, `admin_bootstrap_token`.

**Prerequisite for `version` / `build_time`**: Go's `-X pkgpath.Name=value` ldflag requires `Name` to be a string-typed package-level variable — without it, the flag is silently ignored and the value stays empty. Add to `cmd/proxy/main.go` in PR 1 (same PR that adds the ldflags wiring):
```go
var (
    version   = "dev"
    buildTime = "unknown"
)
```
Config handler reads these directly. CI smoke test: on a tagged build, assert `/api/admin/config` returns `version != "dev"` and `build_time != "unknown"`.

### Admin Mutation Concurrency Guardrail (PR 0 for deactivation, PR 3 for role change)

Earlier draft proposed a single-statement UPDATE with an inline admin-count subquery. **That's not concurrency-safe** under READ COMMITTED: two concurrent UPDATEs on different admin rows each see `count=2` in their subquery snapshots and both succeed, leaving zero active admins.

**Correct approach** — transaction + Postgres advisory lock, applied to all three mutation paths that can remove an admin:

```go
// pseudocode used by role-change, deactivate, and (future) delete-user
tx := db.Begin()
tx.Exec("SELECT pg_advisory_xact_lock(hashtext('admin_mutations'))")
// Now serialized across all admin-affecting mutations for this transaction

var currentRole string
var currentActive bool
tx.QueryRow("SELECT role, is_active FROM users WHERE id = $1 FOR UPDATE", id).
    Scan(&currentRole, &currentActive)

wouldRemoveAdmin := (currentRole == "admin" && currentActive) &&
    ((mutation == "role_to_user") ||
     (mutation == "deactivate"))

if wouldRemoveAdmin {
    var activeAdmins int
    tx.QueryRow(
        "SELECT COUNT(*) FROM users WHERE role='admin' AND is_active=TRUE",
    ).Scan(&activeAdmins)
    if activeAdmins <= 1 {
        tx.Rollback()
        return ErrLastActiveAdmin   // handler → 409 last_admin
    }
}

tx.Exec("UPDATE users SET <mutation>, updated_at=NOW() WHERE id = $1", id)
tx.Commit()
```

Why advisory lock over `FOR UPDATE`:
- `FOR UPDATE` on only the target row doesn't block a concurrent mutation of a *different* admin row, so two concurrent demotions of two different admins still race.
- Locking the whole `users` table is too coarse.
- `pg_advisory_xact_lock(hashtext('admin_mutations'))` serializes only admin-affecting mutations against each other. Regular user updates are unaffected.
- Lock key is a constant hash so every admin mutation contends on the same lock.

**Which operations use this guardrail**:
- `PUT /api/admin/users/{id}/role` (PR 3) — role change to `user` where current role is `admin`
- `PUT /api/admin/users/{id}/deactivate` (PR 0 **modifies existing endpoint**) — sets `is_active=FALSE` where role is `admin`
- `PUT /api/admin/users/{id}/activate` — does NOT need the guardrail (monotonically adds admins)
- Future: `DELETE /api/admin/users/{id}` if/when it lands

Handler translates `ErrLastActiveAdmin` into `409 last_admin` with message "Cannot remove the last active admin."

Tests: spawn two goroutines running the mutation against two different admin rows; only one should succeed, the other returns 409.

### Rate-Limit Cache Invalidation

**Not needed**. Auth middleware re-reads key each request; `ratelimit.Allow` adopts new capacity on next call. Verified by existing test `TestAllow_CapacityUpdateOnRateLimitChange`. A regression test in PR 3 locks this contract for the new admin endpoint.

---

## Backend Follow-ups (discovered during FE PR C)

Small backend cleanups surfaced while verifying admin-API shapes against the frontend. Not blocking any FE work; all have a frontend workaround in place that can be deleted once the backend change ships.

### BE Follow-up 1 — JSON tags on `store.CreditPricing` ✅ DONE

**Status.** Backend change shipped in `skrx7392/local-ai-proxy#31` (2026-04-14). Frontend cleanup shipped in the follow-on admin-frontend PR same day — `PricingWireSchema` + transform deleted, fixtures + mockBackend switched to snake_case. Section kept for historical context.

**Problem.** `GET /api/admin/pricing` emits PascalCase field names (`ID`, `ModelID`, `PromptRate`, `CompletionRate`, `TypicalCompletion`, `EffectiveFrom`, `Active`) because `store.CreditPricing` has no `json:"..."` tags, so Go's default encoder uses the Go field names directly. Every other admin resource (keys, users, accounts, registration tokens) uses snake_case, and the pricing **upsert** endpoint (`POST /api/admin/pricing`) already accepts snake_case (`model_id`, `prompt_rate`, etc.). The resource is therefore inconsistent with itself across read vs. write.

**Current frontend workaround.** `src/features/pricing/schemas.ts` defines a `PricingWireSchema` that reads the PascalCase shape and pipes through `.transform()` into a clean snake_case `PricingSchema`. Everything internal (hooks, columns, dialogs) works against the normalized snake_case shape. This exists solely to translate for the one inconsistent endpoint.

**Fix (backend).**

File: `internal/store/store.go` line 134. Add JSON tags:

```go
type CreditPricing struct {
    ID                int64     `json:"id"`
    ModelID           string    `json:"model_id"`
    PromptRate        float64   `json:"prompt_rate"`
    CompletionRate    float64   `json:"completion_rate"`
    TypicalCompletion int       `json:"typical_completion"`
    EffectiveFrom     time.Time `json:"effective_from"`
    Active            bool      `json:"active"`
}
```

Nothing else in the backend needs to change — `internal/admin/admin.go::listPricing` already calls `json.Encoder.Encode(pricing)` with no transformation, so adding tags propagates automatically. `ListActivePricing` (`internal/store/credits.go:328`) doesn't change shape, just emits different field names on the wire.

**Verify.** Existing tests:
- `internal/admin/list_envelope_test.go::TestListPricing_Envelope_Pagination` — uses `map[string]any`, so won't break on key rename.
- `internal/admin/list_envelope_test.go::TestListPricing_Legacy` — same.

Add at least one assertion on the new field names (e.g. `_, ok := body[0]["model_id"]; ok` alongside the existing shape checks) so future regressions are caught.

**Rollout order — important.** The frontend currently expects PascalCase on the wire. If the backend ships the tags first, the admin `/pricing` page breaks until the frontend follow-up deploys. Two safe sequences:

1. **Defensive-parse first (safest):** land a small FE PR that makes `PricingWireSchema` tolerate *both* PascalCase and snake_case (union with `.or()` or two-shot parse). Deploy. Then backend PR adding tags. Then FE cleanup PR dropping the PascalCase branch and the transform. Three PRs total, zero downtime.
2. **Coordinated deploy:** backend PR + matching FE PR (drop `PricingWireSchema`, use snake_case directly) reviewed together, merged in sequence with a <5min gap. Works if you control deploy timing for both.

**Frontend follow-up** (after backend ships the tags):
- Delete `PricingWireSchema` and the `.transform()` in `src/features/pricing/schemas.ts`; redefine `PricingSchema` directly as `z.object({ id, model_id, prompt_rate, completion_rate, typical_completion, effective_from, active })`.
- Update `src/test/msw/fixtures.ts::pricing` — switch PascalCase fixture keys to snake_case.
- Update `e2e/mockBackend.mjs::pricing` — same.
- Update `src/features/pricing/__tests__/hooks.test.tsx::usePricingList` — the assertion that checks `ModelID` is `undefined` (i.e. nothing leaked) becomes redundant and can be removed.

---

## Frontend PR Sequence

**Status (2026-04-15):** FE A–G merged. Only FE H (polish, standalone) remains.

| PR | Pairs With | Scope |
|---|---|---|
| **A** ✅ | — | Repo bootstrap: `package.json`, `tsconfig.json` (strict), ESLint/Prettier, Vitest, Playwright, MSW, Dockerfile (multi-stage Node 22 alpine), k8s manifests for `admin-frontend` service, ingress at `admin.ai.kinvee.in`, CI/CD workflows. **Design system**: full `src/theme/*` token + recipe set, `/styleguide` route (initially **public with `X-Robots-Tag: noindex` and `<meta name="robots" content="noindex,nofollow">`** — auth doesn't exist yet). Playwright full-page screenshot tests of `/styleguide` in both themes. Auth gating flips to on in PR B. |
| **B** ✅ | BE 0 | Auth: **next-auth v5 (beta) with JWT strategy**. Credentials provider's `authorize()` calls backend `POST /api/auth/login`; on success, the `jwt` callback folds raw session token + user role + email + expiry into the JWT. The `session` callback returns **only** `{user: {id, email, role}, expires}` — it explicitly strips `backendToken` so it never reaches `useSession()` or `GET /api/auth/session`. JWT is encrypted with `AUTH_SECRET`, set httpOnly, sameSite=strict, scoped to `admin.ai.kinvee.in`, `maxAge=21600`. `/login` page (email + password via react-hook-form + Zod). `middleware.ts` runs `auth()` on all routes except `/login`, `/api/auth/*`, `/api/health` (everything else including `/styleguide` is gated). `/api/admin/[...path]` BFF reads the raw JWT via `getToken({ req, secret: process.env.AUTH_SECRET, raw: false })` (server-only, gets the full encrypted JWT payload including `backendToken`), injects `Authorization: Bearer <backendToken>` on the upstream call, strips client-provided auth headers. **Logout wiring**: NextAuth owns `POST /api/auth/signout`; backend invalidation happens via a NextAuth `events.signOut` handler that reads `message.token.backendToken` and calls backend `POST /api/auth/logout` with `Authorization: Bearer <backendToken>` before NextAuth clears the cookie (best-effort — cookie clears either way). Topbar session badge (expires_in countdown) + logout button that calls NextAuth's `signOut()`. |
| **C** ✅ | BE 1 | First feature slice against **currently-existing** backend endpoints. Scope corrected to what the backend actually exposes:<br>• **Keys**: list, create, revoke<br>• **Users**: list, activate, deactivate (no update, no create via FE)<br>• **Accounts**: list, grant credits, create account-scoped key (no detail/update/delete — `/accounts/[id]` page synthesizes from list)<br>• **Pricing**: list, upsert, delete (soft)<br>• **Registration tokens**: list, create, revoke<br>`legacyOrEnvelope` helper accepts both envelope and bare-array responses during the PR 4 transition. Introduces `DataTable`, `FilterBar`, `Pagination`, `ConfirmDialog`, `OneTimeSecretDialog`. All forms via react-hook-form + Zod. |
| **D** ✅ | BE 4 | Flip `apiFetch` to always send `envelope=1` on list paths. Drop `legacyOrEnvelope` — strict envelope schema. Real server-driven pagination in all DataTables. New `/registrations` page. URL-synced filters via `searchParams`. |
| **E** ✅ | BE 3 | `/users/[id]` detail page + role change (optimistic UI + last-admin guard + 409 handling). `/keys/[id]` detail + rate-limit update + session-limit update. Extended detail schemas. **See "FE E tripwire" below before starting.** |
| **F** ✅ | BE 2 | `/usage` analytics: tabs for Summary / By Model / By User / Timeseries. Shared FilterBar above tabs. Dashboard `/` gets real StatCards + mini TimeseriesChart. All charts use `dataViz.ts` palette + theme object. |
| **G** ✅ | BE 5 | `/config` page (read-only config snapshot, grouped: Backend / Limits / Observability / Build). Topbar health indicator (dot color from `/admin/health`) + tooltip with latest check results. |
| **H** | — | Polish: empty states on every list, `error.tsx` per route group, loading skeletons, axe E2E audit per page, CHANGELOG, README screenshots, keyboard shortcuts (`g u`, `g k`, `/` for search). |

### FE E tripwire — list vs. detail envelope shapes

FE D shipped `parseEnvelope` as a **strict list parser**: requires `{data: T[], pagination: {limit, offset, total}}`. Calling it on a detail response will throw, because detail endpoints on the backend emit a different (but deliberate) shape.

**Backend contract:**

- **List** (`listUsers`, `listKeys`, etc.) → `writeEnvelope(w, slice, &Pagination{...})` → wire shape `{data: [...], pagination: {...}}`.
- **Detail / single-object** (`getUser`, `updateUserRole`, `updateKeyRateLimit`, etc.) → `writeEnvelope(w, obj, nil)` → wire shape `{data: {...}}`. Pagination is dropped via `omitempty` in `internal/admin/envelope.go:13` because it's not meaningful for a single resource.

This split is correct on the backend — don't "fix" it by padding detail responses with dummy pagination or by stripping the envelope off detail responses. Both options were considered and rejected:

1. Dropping the envelope on detail endpoints re-introduces the pre-PR-4 inconsistency the envelope was built to kill.
2. Padding with `{limit:1, offset:0, total:1}` lies on the wire and obscures the semantic difference.

**Frontend action in FE E:**

1. Add a sibling helper next to `parseEnvelope` in `src/lib/api/envelope.ts`:

   ```ts
   export function parseDataEnvelope<T>(raw: unknown, item: ZodType<T>): T {
     return z.object({ data: item }).parse(raw).data;
   }
   ```

2. New detail hooks (`useUserDetail`, `useKeyDetail`, plus the role-change and rate-limit mutation return-parsers) call `parseDataEnvelope`; list hooks continue to call `parseEnvelope`. Keep the two helpers distinct so a list response that arrives without pagination fails fast at the schema boundary — that's a backend bug, not a shape we should silently tolerate.

**Backend readability cleanup (optional, bundle with FE E or BE 3):**

Rename the two call shapes at the handler layer so intent is obvious:

```go
writeEnvelope(w, data, pag)  // stays as-is for lists
writeDetail(w, data)          // new helper; internally calls writeEnvelope(w, data, nil)
```

Pure readability — no wire change, no client impact. Skip if it's not the hill anyone wants to die on.

### Repo Scaffold Files (PR A)

```
local-ai-proxy-admin-frontend/
├── .github/workflows/{ci.yml,cd.yml}
├── deploy/
│   ├── Dockerfile
│   └── k8s/{deployment.yaml,service.yaml,ingress.yaml}
├── e2e/
│   ├── auth.spec.ts
│   ├── keys.spec.ts
│   ├── users.spec.ts
│   ├── usage.spec.ts
│   ├── styleguide.spec.ts
│   ├── mockBackend.mjs                    # real HTTP server on :9999 — impersonates backend for Playwright; NOT MSW
│   └── fixtures/{testSession.ts,...}
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── (public)/login/page.tsx
│   │   ├── (admin)/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx                      # dashboard
│   │   │   ├── users/{page.tsx,[id]/page.tsx}
│   │   │   ├── keys/{page.tsx,[id]/page.tsx}
│   │   │   ├── accounts/{page.tsx,[id]/page.tsx}
│   │   │   ├── pricing/page.tsx
│   │   │   ├── registration-tokens/page.tsx
│   │   │   ├── registrations/page.tsx
│   │   │   ├── usage/page.tsx
│   │   │   ├── config/page.tsx
│   │   │   └── styleguide/page.tsx
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts   # next-auth handler
│   │       ├── health/route.ts               # for k8s readiness
│   │       └── admin/[...path]/route.ts      # BFF proxy
│   ├── components/
│   │   ├── layout/{AdminShell,TopBar,SideNav}.tsx
│   │   ├── data/{DataTable,Pagination,FilterBar,EmptyState}.tsx
│   │   ├── charts/{TimeseriesChart,ModelBreakdownChart,UserLeaderboard,StatCard}.tsx
│   │   ├── forms/{FormField,FormSelect,FormDateTime,FormMoney}.tsx
│   │   ├── dialogs/{ConfirmDialog,OneTimeSecretDialog}.tsx
│   │   └── providers/{ChakraProvider,QueryProvider,ToastProvider}.tsx
│   ├── hooks/
│   │   ├── api/{useUsers,useUser,useKeys,useKey,useAccounts,usePricing,useRegistrationTokens,useRegistrations,useUsage,useConfig,useAdminHealth}.ts
│   │   ├── mutations/{useCreateKey,useRevokeKey,useUpdateKeyRateLimit,useSetUserRole,...}.ts
│   │   └── ui/{useConfirm,useToast,useDisclosure}.ts
│   ├── lib/
│   │   ├── api/{client.ts,errors.ts,envelope.ts,queryKeys.ts}.ts
│   │   ├── schemas/{user,key,account,pricing,registrationToken,registration,usage,config,health,pagination,error}.ts
│   │   ├── auth/{options.ts,requireSession.ts}.ts   # options.ts = next-auth config (Credentials provider + jwt callback); no DB adapter
│   │   └── utils/{date,format,filters}.ts
│   ├── middleware.ts
│   ├── theme/{index.ts,tokens.ts,semanticTokens.ts,globalCss.ts,dataViz.ts,recipes/*}
│   ├── types/{api.ts,domain.ts}
│   └── test/{setup.ts,msw/{handlers,server,browser}.ts,fixtures.ts}
├── CLAUDE.md
├── PLAN.md                                   # this file
├── README.md
├── package.json
└── tsconfig.json
```

### Environment Variables

next-auth v5 renamed `NEXTAUTH_*` to `AUTH_*`. Both frontend and backend vars listed where they cross boundaries.

| Name | Required | Default | Notes |
|---|---|---|---|
| `BACKEND_URL` | yes | — | Cluster-internal backend (e.g. `http://ai-proxy.local-ai.svc.cluster.local:80`) — used by BFF proxy only |
| `AUTH_SECRET` | yes | — | 32+ char random; used by next-auth v5 to encrypt the JWT. Fail-fast at startup if < 32 chars. |
| `AUTH_URL` | prod only | — | Canonical public URL (`https://admin.ai.kinvee.in`). Optional in dev. |
| `AUTH_TRUST_HOST` | yes in k8s | `true` | Required behind Traefik/ingress |
| `NODE_ENV` | yes | `development` | — |
| `PORT` | no | `3000` | — |
| `NEXT_PUBLIC_APP_NAME` | no | `local-ai admin` | Client-visible branding |
| `NEXT_TELEMETRY_DISABLED` | no | `1` | — |
| `LOG_LEVEL` | no | `info` | — |

Backend-side env vars introduced/changed by PR 0:

| Name | Required | Default | Notes |
|---|---|---|---|
| `ADMIN_BOOTSTRAP_TOKEN` | no | unset | When set, enables **reusable** `POST /api/admin/bootstrap` (first-admin creation and DR path). Rotate or unset between uses. |
| `ADMIN_KEY` | yes (existing) | — | Still present as scripts / emergency credential |

### Data Layer

**`src/lib/api/client.ts`** — `apiFetch<T>(path, { method?, body?, params?, signal? })`:
- Hits `/api/admin${path}` (same-origin, proxied by Next).
- Adds `Content-Type: application/json` when body present.
- Adds `X-Requested-With: XMLHttpRequest` (CSRF paranoia layer).
- Auto-adds `envelope=1` on allowlisted list paths (`/users`, `/keys`, `/accounts`, `/registration-tokens`, `/pricing`, `/usage`, `/registrations`) when no trailing `/{id}`.
- On non-2xx: throws typed `ApiError { status, code, message, requestId }`.
- On 401: emits session-expired event → toast + redirect to `/login`.

**Every hook calls `apiFetch` — never raw `fetch`**. This includes health and config:
- `useAdminHealth()` → `apiFetch('/health')` → same-origin `/api/admin/health` → BFF proxy → backend `GET /api/admin/health`.
- `useConfig()` → `apiFetch('/config')` → backend `GET /api/admin/config`.
- `useUsageSummary(filters)` → `apiFetch('/usage/summary', { params: filters })`.

Direct `fetch('/api/admin/...')` in hooks is banned by lint rule — it bypasses the envelope/error/401 plumbing. The only exception is the BFF proxy route itself (which is server-side and calls `${BACKEND_URL}` directly).

**`QueryClient` defaults**:
- `staleTime: 30_000`, `refetchOnWindowFocus: false`, `retry: (n, e) => isNetworkError(e) && n < 2`.
- Global error → toast with `request_id`.

**Query key convention**: `['users', 'list', filters]`, `['users', 'detail', id]`, etc.

### Testing Layers

**Unit / component (Vitest + MSW browser mode)**. MSW's Service Worker patches `window.fetch` in the jsdom browser context — fine for testing components that call `apiFetch` directly, since those fetches originate in the browser. Fast, no external processes.

**E2E (Playwright + real mock HTTP backend)**. MSW does NOT work here: the BFF proxy route (`/api/admin/[...path]`) and NextAuth's `authorize()` call `fetch()` from the Next **server** runtime. Node's fetch bypasses the browser Service Worker entirely — MSW browser mode has no hook to intercept it. MSW's `msw/node` mode patches Node's fetch, but wiring it into the Next dev/prod server's lifecycle during Playwright runs is fragile.

Instead, PR A ships a real mock backend as a tiny Node HTTP server (`e2e/mockBackend.mjs`, ~150 lines) that impersonates the backend endpoints the BFF calls. Playwright's `webServer` array starts both processes:

```ts
// playwright.config.ts
export default defineConfig({
  testDir: './e2e',
  webServer: [
    {
      command: 'node e2e/mockBackend.mjs',
      port: 9999,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run build && npm start',
      port: 3000,
      env: {
        BACKEND_URL: 'http://localhost:9999',
        AUTH_SECRET: 'e2e-test-secret-at-least-32-chars-long-okay',
        AUTH_URL: 'http://localhost:3000',
        AUTH_TRUST_HOST: 'true',
        NODE_ENV: 'production',
      },
      reuseExistingServer: !process.env.CI,
    },
  ],
  use: { baseURL: 'http://localhost:3000' },
});
```

`mockBackend.mjs` surface (sketch):
- `POST /api/auth/login` — accepts a fixture email+password (e.g. `admin@test.local` / `testpass123`), returns `{token, expires_in, user: {id, email, role: 'admin'}}`. Returns 401 otherwise.
- `POST /api/auth/logout` — accepts any Bearer token, 204.
- `GET /api/admin/keys` — returns canned envelope with 2–3 fixture keys.
- `GET /api/admin/users`, `/accounts`, etc. — canned envelopes.
- `GET /api/admin/usage/summary` etc. — canned analytics data.

Shape is documented inline in the file. E2E fixtures under `e2e/fixtures/` extend the baseline when a test needs different data (e.g. empty state, error responses) by POSTing to a `/__set-fixture` control endpoint on the mock backend.

This is lower-fidelity than running the real backend in docker-compose but far faster and has zero DB setup. Upgrade to real-backend E2E is a future-PR option if integration fidelity matters more than CI speed.

### Auth Flow (next-auth v5 JWT strategy)

Why JWT, not database adapter: backend's `user_sessions` table stores only `token_hash` (`internal/store/schema.sql:37-43`). The raw session token is returned exactly once at login (`internal/user/handler.go:188-202`). A next-auth DB adapter querying `user_sessions` couldn't recover the raw token to forward to the backend. JWT strategy keeps the raw token **inside** the encrypted cookie, where only the Next server can read it.

**Critical invariant — backend token never reaches the client**. This requires explicit separation of what the `jwt` callback stores vs. what the `session` callback exposes:

```ts
// src/lib/auth/options.ts
export const authOptions: NextAuthConfig = {
  session: { strategy: 'jwt', maxAge: 21600 },  // 6h
  secret: process.env.AUTH_SECRET,
  providers: [
    Credentials({
      name: 'Admin login',
      credentials: { email: {}, password: {} },
      authorize: async (creds) => {
        const res = await fetch(`${process.env.BACKEND_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(creds),
        });
        if (!res.ok) return null;
        const { token, expires_in, user } = await res.json();

        if (user.role !== 'admin') {
          // Backend already created a user_sessions row on valid creds.
          // We reject non-admins at the frontend, but the row would otherwise
          // live for 7 days with nobody holding the raw token — session
          // clutter + misleading audit trail. Invalidate it before returning.
          // Best-effort: if this fails, the row TTLs out.
          await fetch(`${process.env.BACKEND_URL}/api/auth/logout`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            signal: AbortSignal.timeout(3000),
          }).catch(() => {});
          return null;
        }
        // Return value is passed into jwt() callback as `user`
        return { id: String(user.id), email: user.email, role: user.role,
                 backendToken: token, backendExpiresAt: Date.now() + expires_in * 1000 };
      },
    }),
  ],
  callbacks: {
    // jwt() stores what's in the COOKIE (encrypted, server-only).
    // Put the backend token here. Set sub/email EXPLICITLY — don't rely
    // on next-auth v5 beta implicitly copying them from the user object
    // (behavior has drifted across v4→v5 and may change mid-beta).
    async jwt({ token, user }) {
      if (user) {
        token.sub              = user.id;                    // explicit
        token.email            = user.email;                 // explicit
        token.role             = (user as any).role;
        token.backendToken     = (user as any).backendToken;
        token.backendExpiresAt = (user as any).backendExpiresAt;
      }
      return token;
    },
    // session() returns what the CLIENT sees via useSession() / /api/auth/session.
    // NEVER spread ...token here. Whitelist only non-secret fields.
    async session({ session, token }) {
      session.user = {
        id:    token.sub!,
        email: token.email!,
        role:  (token as any).role,
      };
      // Deliberately DO NOT assign backendToken.
      return session;
    },
  },
  events: {
    // Called when the user signs out (via NextAuth's POST /api/auth/signout).
    // This is the only hook where we can read the raw JWT (and therefore
    // backendToken) right before NextAuth clears the cookie. Without this
    // handler, backend user_sessions rows accumulate until their 6h TTL.
    async signOut(message) {
      // message shape differs by session strategy; for JWT strategy it's { token }.
      const token = 'token' in message ? message.token : undefined;
      const backendToken = (token as any)?.backendToken as string | undefined;
      if (!backendToken) return;
      try {
        await fetch(`${process.env.BACKEND_URL}/api/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${backendToken}` },
          // short timeout — don't block user-visible signout on backend latency
          signal: AbortSignal.timeout(3000),
        });
      } catch {
        // best-effort: cookie is cleared by NextAuth regardless;
        // stale backend session rows age out via 6h TTL.
      }
    },
  },
};
```

**Flow**:
```
1. POST /api/auth/signin/credentials (next-auth internal route) → authorize() calls
   backend POST /api/auth/login → backend returns { token, expires_in, user }.
2. authorize() returns user + backendToken; next-auth encrypts into JWT cookie
   (httpOnly, sameSite=strict, scoped admin.ai.kinvee.in, maxAge 21600).
3. middleware.ts runs auth() on every route except /login, /api/auth/*, /api/health.
4. Page code uses useSession() or server auth() — sees ONLY { user: {id, email, role}, expires }.
   backendToken is not reachable from any client API or server-render context that forwards to client.
5. BFF /api/admin/[...path]/route.ts — SERVER ONLY:
     import { getToken } from 'next-auth/jwt';
     const jwt = await getToken({ req, secret: process.env.AUTH_SECRET });
     if (!jwt?.backendToken) return new Response(null, { status: 401 });
     const upstream = await fetch(`${BACKEND_URL}/api/admin/${path}${qs}`, {
       method: req.method,
       body: req.body,
       headers: { ...filteredHeaders,
                  Authorization: `Bearer ${jwt.backendToken}` },
     });
     return new Response(upstream.body, {
       status: upstream.status,
       headers: upstream.headers,
     });
6. On upstream 401 (backend session revoked/expired): BFF returns 401 to client;
   client-side apiFetch catches 401, calls signOut() to clear JWT cookie,
   redirects to /login.
7. POST /api/auth/signout (owned by NextAuth) → fires events.signOut hook,
   which reads backendToken from the JWT and calls backend POST /api/auth/logout
   with Authorization: Bearer <backendToken> (3s timeout, best-effort) →
   NextAuth clears the JWT cookie regardless of backend response. Backend
   deletes the user_sessions row; if the event call failed, the row TTLs
   out at 6h. No in-session retry needed.
```

**Security properties**:
- Backend session token is **never** returned by `session()` callback → never reachable from browser JS.
- BFF reads it via `getToken()` (raw JWT) — a server-only API that requires access to `AUTH_SECRET`, which the client bundle doesn't have.
- JWT `exp` matches backend session expiry (6h for admins) — no JWT outlives its backing `user_sessions` row under normal conditions.
- Backend is the real source of truth: `user_sessions` row deletion immediately revokes (next request 401s → BFF triggers `signOut`).
- CSRF: `sameSite=strict` cookie + `X-Requested-With: XMLHttpRequest` header check in the BFF proxy.

**Enforcement tests** (FE PR B):
- Unit test: mock a JWT with `backendToken`, invoke `session()` callback, assert return value has **no** `backendToken` field.
- Integration test: `GET /api/auth/session` as authenticated user, assert response body has no `backendToken` substring.
- Playwright: in browser devtools during an authenticated session, assert `document.cookie` is empty (httpOnly) and `fetch('/api/auth/session').then(r => r.text())` contains no backend token.

**JWT payload budget check**: `{sub, email, role, backendToken, iat, exp}` ≈ 280 bytes plaintext → ~400 bytes encrypted. Well under the 4KB cookie limit.

### Deployment

See **[Deployment Plan](#deployment-plan)** below for the complete spec — topology, manifests, CI/CD, secrets, rollouts, observability, disaster recovery.

---

## Sequencing & Dependencies

```
Backend:  0 → 1 → 2 → 3 → 4 → 5 → 6 → 7(later)
                                           ↑ waits on FE stability

Frontend: A → B → C → D → E → F → G → H
              ↑   ↑   ↑   ↑   ↑   ↑
              BE0 BE1 BE4 BE3 BE2 BE5
```

### Critical Dependencies

- **BE 0 must land before FE B merges** — FE B needs session-token admin auth to function end-to-end.
- **BE 1 can land in parallel with FE A/B/C** — store-only, no HTTP change.
- **BE 2–5 interleave with FE D–G** — each FE PR waits on its paired BE PR.
- **BE 6** (Prometheus expansion) is independent — ships any time after BE 5.
- **BE 7** (envelope flip) ships any time after FE D is merged. No prod bake — single-operator project means rollback + audit risks don't apply; verify by grepping for raw `fetch(` outside the BFF and confirming no unenvelope-aware scripts hit `/api/admin/*` with `X-Admin-Key`.

### Parallel-Safe Pairs

Can be worked on simultaneously by different people:
- BE 0 + FE A (independent)
- BE 1 + FE A/B (BE 1 is store-only; FE A/B don't consume analytics)
- BE 6 + any FE PR (Prometheus is out-of-band)

---

## Deployment Plan

This section replaces the earlier stub. Every detail is grounded in the existing backend deploy (`local-ai-proxy/deploy/*`, `.github/workflows/{ci,cd}.yml`) so patterns stay consistent.

### 1. Topology

```
                                   ┌──────────────────────────────────────┐
                                   │ Cloudflare / DNS (kinvee.in zone)    │
                                   └──────┬───────────────────────┬───────┘
                                          │                       │
                              ai.kinvee.in │                       │ admin.ai.kinvee.in
                                          ▼                       ▼
                                   ┌──────────────┐        ┌──────────────┐
                                   │  Traefik     │        │  Traefik     │
                                   │  (k3s        │        │  (k3s        │
                                   │  ingress,    │        │  ingress,    │
                                   │  TLS via     │        │  TLS via     │
                                   │  cert-       │        │  cert-       │
                                   │  manager)    │        │  manager)    │
                                   └──────┬───────┘        └──────┬───────┘
                                          │ /api → ai-proxy       │ / → admin-frontend
                                          ▼                       ▼
┌─────────────────────── k3s cluster (dev server @ 100.108.60.90) ───────────────────────┐
│                                                                                         │
│  namespace: local-ai                                                                    │
│  ┌─────────────────────────────┐         ┌────────────────────────────────────┐         │
│  │ Deployment: ai-proxy        │         │ Deployment: admin-frontend         │         │
│  │ Service: ai-proxy           │         │ Service: admin-frontend            │         │
│  │ Image: local-ai-proxy:<sha> │         │ Image: local-ai-proxy-admin-       │         │
│  │ Ports: 80 → 8080            │         │   frontend:<sha>                   │         │
│  │                             │         │ Ports: 80 → 3000                   │         │
│  │ Env from Secret:            │         │ Env from Secret:                   │         │
│  │  ADMIN_KEY                  │         │  AUTH_SECRET                       │         │
│  │  DATABASE_URL               │         │                                    │         │
│  │  ADMIN_BOOTSTRAP_TOKEN      │         │ BACKEND_URL (in-cluster):          │         │
│  │  (when set)                 │         │  http://ai-proxy.local-ai          │         │
│  └────────────┬────────────────┘         │         .svc.cluster.local:80      │         │
│               │                          └────────────┬───────────────────────┘         │
│               │                                       │                                 │
│               │ http://ollama.aarogya.svc.cluster.local:11434                           │
│               │ postgres://... (external, in aarogya ns via Service/NodePort)           │
│               ▼                                       ▼                                 │
│  namespace: aarogya                       Both deployments ship logs (stdout JSON)      │
│  ┌────────────────┐    ┌────────────┐     and metrics (/metrics) to observability ns.   │
│  │ Ollama         │    │ Postgres   │                                                   │
│  │ (ClusterIP)    │    │            │                                                   │
│  └────────────────┘    └────────────┘                                                   │
│                                                                                         │
│  namespace: observability                                                               │
│  ┌─────────┐ ┌──────┐ ┌────────────┐ ┌───────┐ ┌───────────────┐                        │
│  │ Grafana │ │ Loki │ │ Prometheus │ │ Alloy │ │ Node Exporter │  (scrapes both apps)   │
│  └─────────┘ └──────┘ └────────────┘ └───────┘ └───────────────┘                        │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

**DNS records** (managed in kinvee.in zone):
- `ai.kinvee.in` A → dev-server public IP (existing)
- `admin.ai.kinvee.in` A → same dev-server public IP (**new — add before PR A deploys**)

Both hostnames terminate at Traefik inside k3s; Traefik routes to the right Service based on the `Host` header.

### 2. Docker build strategy

**Philosophy**: both repos build images on the dev server (via SSH) and import directly into k3s containerd. No external registry. Keeps secrets off third-party infra; trades off image portability.

**Image naming**:
- Backend: `local-ai-proxy:<short-sha>` and a moving `:latest` tag
- Frontend: `local-ai-proxy-admin-frontend:<short-sha>` and `:latest`

Deployments reference `:<short-sha>` (set via kustomize patch at deploy time) so rollouts are explicit and rollback is trivial (`kubectl set image ... :<previous-sha>`).

**Backend Dockerfile** (`local-ai-proxy/deploy/Dockerfile`) — exists today, needs **one change for PR 1** to thread the git SHA as a version string:

```dockerfile
FROM golang:1.26-alpine AS builder
ARG GIT_SHA=unknown
ARG BUILD_TIME=unknown
WORKDIR /src
COPY go.mod ./
COPY . .
RUN go mod tidy
RUN CGO_ENABLED=0 GOOS=linux go build \
    -ldflags="-s -w -X main.version=${GIT_SHA} -X main.buildTime=${BUILD_TIME}" \
    -o /proxy ./cmd/proxy

FROM alpine:3.21
RUN apk add --no-cache ca-certificates tzdata
COPY --from=builder /proxy /proxy
EXPOSE 8080
ENTRYPOINT ["/proxy"]
```

Build command (in CD pipeline; `SHORT_SHA` is a 12-char truncation of the git SHA, derived once in the CD script):
```bash
sudo docker build \
  --build-arg GIT_SHA="${SHORT_SHA}" \
  --build-arg BUILD_TIME="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  -f deploy/Dockerfile \
  -t "local-ai-proxy:${SHORT_SHA}" \
  -t local-ai-proxy:latest \
  .
```

**Frontend Dockerfile** (`local-ai-proxy-admin-frontend/deploy/Dockerfile`) — new:

```dockerfile
# 1. Dependencies
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# 2. Build
FROM node:22-alpine AS builder
ARG GIT_SHA=unknown
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_GIT_SHA=${GIT_SHA}
# Build-time placeholders ONLY — real values come from the k8s Secret at runtime.
# Next imports route handlers during `next build` to analyze them; if the auth
# options module fail-fasts on missing AUTH_SECRET (<32 chars) or BACKEND_URL,
# the build aborts here. These placeholders satisfy those validators without
# ever being used at runtime (the container re-reads from env when it starts).
ENV AUTH_SECRET="build-time-placeholder-32-chars-minimum-length-ok"
ENV BACKEND_URL="http://build-time-placeholder:80"
RUN npm run build   # requires output: 'standalone' in next.config.ts

# 3. Runtime
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
RUN addgroup -S nextjs && adduser -S nextjs -G nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

**Image import into k3s** (runs on dev server; save both SHA and `:latest` tags so containerd has the exact tag the Deployment references):
```bash
sudo docker save \
  "local-ai-proxy-admin-frontend:${SHORT_SHA}" \
  local-ai-proxy-admin-frontend:latest \
  | sudo k3s ctr images import -
```

The import is idempotent; running it a second time is a no-op.

### 3. Kubernetes manifests

Both repos keep manifests in `deploy/k8s/`. Apply order (new cluster): `namespace.yaml` → `service.yaml` → `ingress.yaml` → `deployment.yaml`. Existing cluster: apply any; `kubectl apply` is idempotent.

#### 3.1 Backend (changes for PR 0 + PR 5 only; other manifests unchanged)

**Update `deployment.yaml`** — new env var for bootstrap:
```yaml
env:
  # ... existing vars ...
  - name: ADMIN_BOOTSTRAP_TOKEN
    valueFrom:
      secretKeyRef:
        name: proxy-secret
        key: ADMIN_BOOTSTRAP_TOKEN
        optional: true   # allows unset after first use
```

When the secret is absent (after unseting), `/api/admin/bootstrap` returns 404 — by design.

Readiness/liveness probes unchanged (`/api/healthz/live`, `/api/healthz/ready`).

#### 3.2 Frontend (new, in `local-ai-proxy-admin-frontend/deploy/k8s/`)

**`namespace.yaml`** — reuses `local-ai` (shared with backend):
```yaml
# Not needed — namespace already exists. Skip this file in the frontend repo.
```

**`deployment.yaml`**:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: admin-frontend
  namespace: local-ai
spec:
  replicas: 1
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0
      maxSurge: 1
  selector:
    matchLabels:
      app: admin-frontend
  template:
    metadata:
      labels:
        app: admin-frontend
    spec:
      containers:
        - name: admin-frontend
          image: local-ai-proxy-admin-frontend:latest
          imagePullPolicy: Never
          ports:
            - containerPort: 3000
          env:
            - name: NODE_ENV
              value: "production"
            - name: PORT
              value: "3000"
            - name: NEXT_TELEMETRY_DISABLED
              value: "1"
            - name: BACKEND_URL
              value: "http://ai-proxy.local-ai.svc.cluster.local:80"
            - name: AUTH_URL
              value: "https://admin.ai.kinvee.in"
            - name: AUTH_TRUST_HOST
              value: "true"
            - name: AUTH_SECRET
              valueFrom:
                secretKeyRef:
                  name: admin-frontend-secret
                  key: AUTH_SECRET
            - name: LOG_LEVEL
              value: "info"
          livenessProbe:
            httpGet:
              path: /api/health
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: /api/health
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 10
          resources:
            requests:
              memory: "128Mi"
              cpu: "50m"
            limits:
              memory: "256Mi"
              cpu: "200m"
```

**`service.yaml`**:
```yaml
apiVersion: v1
kind: Service
metadata:
  name: admin-frontend
  namespace: local-ai
spec:
  selector:
    app: admin-frontend
  ports:
    - port: 80
      targetPort: 3000
      protocol: TCP
```

**`ingress.yaml`**:
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: admin-frontend-ingress
  namespace: local-ai
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: traefik
  tls:
    - hosts: [admin.ai.kinvee.in]
      secretName: admin-frontend-tls
  rules:
    - host: admin.ai.kinvee.in
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: admin-frontend
                port:
                  number: 80
```

### 4. Secrets

All secrets stored in k8s Secrets, **never committed to git**. Created/updated by the CD pipeline using `kubectl create secret ... --dry-run=client -o yaml | kubectl apply -f -` (idempotent upsert).

| Secret | Namespace | Keys | Source |
|---|---|---|---|
| `proxy-secret` | `local-ai` | `ADMIN_KEY`, `DATABASE_URL`, `ADMIN_BOOTSTRAP_TOKEN` (optional) | GitHub Actions secrets |
| `admin-frontend-secret` | `local-ai` | `AUTH_SECRET` | GitHub Actions secrets |
| `ai-proxy-tls` | `local-ai` | managed by cert-manager | auto |
| `admin-frontend-tls` | `local-ai` | managed by cert-manager | auto |

**Secret rotation**:
- `AUTH_SECRET`: rotating invalidates all active admin sessions (by design). Document in runbook. Change in GitHub Actions → re-deploy → rollout picks up new secret. Users re-login.
- `ADMIN_KEY`: same pattern. Scripts using old key will 401.
- `DATABASE_URL`: rotate Postgres password → update GitHub secret → redeploy.
- `ADMIN_BOOTSTRAP_TOKEN`: set only when needed, remove from GitHub Actions secrets + k8s secret after use. Redeploy picks up the removal.

**Generating `AUTH_SECRET`**: `openssl rand -base64 32` or `node -e "console.log(crypto.randomBytes(32).toString('base64'))"`.

### 5. TLS / cert-manager

Existing cluster-issuer `letsencrypt-prod` handles both domains. When the frontend ingress is applied, cert-manager:
1. Sees the `cert-manager.io/cluster-issuer` annotation
2. Creates a `Certificate` resource for `admin.ai.kinvee.in`
3. Completes HTTP-01 challenge via Traefik (k3s routes the challenge traffic back)
4. Provisions `admin-frontend-tls` secret with cert + key
5. Traefik serves the cert on the ingress

**First-time deploy**: DNS record must exist before the ingress applies, else the ACME challenge fails and cert-manager keeps retrying (not fatal, just delays TLS).

### 6. CI pipelines

#### 6.1 Backend CI (existing, one addition)

Current `ci.yml` — lint + build + test with 60% coverage gate. No changes beyond:
- **PR 1 adds**: `EXPLAIN` assertions in the test suite that check specific filtered queries against a seeded dataset and fail only when a **named expected index** is missing from the plan. Broad no-filter aggregates are not asserted (the planner may legitimately choose a seq scan when most rows qualify). See the "EXPLAIN assertions" table in Analytics SQL for the exact set of queries that are checked and which index each must use. Integrated into the test suite, not a separate CI job.

#### 6.2 Backend CD (existing, two additions for PR 0)

Update `cd.yml` for three things:
1. Include `deploy/k8s/deployment.yaml` in the apply set (already does).
2. Include `ADMIN_BOOTSTRAP_TOKEN` in the secret upsert — but **only when set in GitHub Actions secrets**. Approach: always include the key with empty-string default, and have the Go app treat empty as "unset". Or use `--from-literal=ADMIN_BOOTSTRAP_TOKEN=${ADMIN_BOOTSTRAP_TOKEN:-}` which yields empty on absence.
3. **Fix the existing checkout step** to pin to the tested SHA. Current `cd.yml` uses `actions/checkout@v4` without a `ref`, which on `workflow_run` events resolves to `main`'s current HEAD — **not** the SHA whose CI just succeeded. A fast follow-up push deploys untested code under the previous SHA's label. Add `ref: ${{ github.event.workflow_run.head_sha }}`:
   ```yaml
   steps:
     - uses: actions/checkout@v4
       with:
         ref: ${{ github.event.workflow_run.head_sha }}
     # ... rest unchanged
   ```

Build step computes a short SHA once and uses it consistently for image tag, `kubectl set image`, and ldflags:
```yaml
- name: Deploy to k3s
  env:
    FULL_SHA: ${{ github.event.workflow_run.head_sha }}
  run: |
    SHORT_SHA="${FULL_SHA:0:12}"
    ...
    sudo docker build \
      --build-arg GIT_SHA="${SHORT_SHA}" \
      --build-arg BUILD_TIME="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
      -f deploy/Dockerfile \
      -t "local-ai-proxy:${SHORT_SHA}" \
      -t local-ai-proxy:latest \
      .

    sudo docker save local-ai-proxy:${SHORT_SHA} local-ai-proxy:latest | sudo k3s ctr images import -
    sudo kubectl -n local-ai set image deployment/ai-proxy ai-proxy=local-ai-proxy:${SHORT_SHA}
    sudo kubectl -n local-ai rollout status deployment/ai-proxy --timeout=120s
```

Same short-SHA convention applies to the frontend CD (shown below). Short SHAs make `kubectl describe pod` readable and stay consistent with the version string reported via `/api/admin/config`.

Switch from `rollout restart` to `set image` so the deployment records which SHA is running — makes rollback trivial.

#### 6.3 Frontend CI (new)

`local-ai-proxy-admin-frontend/.github/workflows/ci.yml`:

```yaml
name: Node CI
on:
  push: { branches: [main] }
  pull_request: { branches: [main] }
  workflow_dispatch:
concurrency:
  group: ci-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: npm }
      - run: npm ci
      - run: npm run lint
      - run: npm run format:check

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: npm }
      - run: npm ci
      - run: npm run typecheck

  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: npm }
      - run: npm ci
      - run: npm run test:coverage
      - name: Check coverage
        run: |
          COV=$(jq '.total.lines.pct' coverage/coverage-summary.json)
          [ "$(echo "$COV < 70" | bc)" = "1" ] && { echo "::error::Coverage $COV% below 70%"; exit 1; } || echo "Coverage $COV%"

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: npm }
      - run: npm ci
      - env:
          AUTH_SECRET: "build-time-placeholder-at-least-32-characters-long"
          BACKEND_URL: "http://placeholder:80"
        run: npm run build

  e2e:
    runs-on: ubuntu-latest
    needs: [build]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: npm }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - env:
          AUTH_SECRET: "e2e-test-secret-at-least-32-chars-long-okay"
          BACKEND_URL: "http://localhost:9999"   # real mock HTTP server, see e2e/mockBackend.mjs
        run: npm run test:e2e

  ci:
    if: always()
    needs: [lint, typecheck, unit, build, e2e]
    runs-on: ubuntu-latest
    steps:
      - run: |
          for r in "${{ needs.lint.result }}" "${{ needs.typecheck.result }}" "${{ needs.unit.result }}" "${{ needs.build.result }}" "${{ needs.e2e.result }}"; do
            [ "$r" = "success" ] || { echo "$r"; exit 1; }
          done
```

#### 6.4 Frontend CD (new)

Mirrors backend CD pattern. `.github/workflows/cd.yml`:

```yaml
name: Deploy admin-frontend
on:
  workflow_run:
    workflows: ["Node CI"]
    types: [completed]
    branches: [main]
concurrency:
  group: cd-admin-frontend
  cancel-in-progress: true

jobs:
  deploy:
    if: github.event.workflow_run.conclusion == 'success'
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      # CRITICAL: pin checkout to the commit whose CI passed, not main's current
      # HEAD. On workflow_run, the default ref is the default branch tip — a
      # fast follow-up push would cause us to build newer, untested code under
      # the previous SHA's tag. See https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#workflow_run
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.workflow_run.head_sha }}
      - uses: tailscale/github-action@v3
        with:
          oauth-client-id: ${{ secrets.TAILSCALE_OAUTH_CLIENT_ID }}
          oauth-secret: ${{ secrets.TAILSCALE_OAUTH_SECRET }}
          tags: tag:ci

      - name: Deploy
        env:
          SSH_PRIVATE_KEY: ${{ secrets.DEV_SERVER_SSH_KEY }}
          AUTH_SECRET: ${{ secrets.AUTH_SECRET }}
          FULL_SHA: ${{ github.event.workflow_run.head_sha }}
        run: |
          SHORT_SHA="${FULL_SHA:0:12}"
          mkdir -p ~/.ssh
          echo "$SSH_PRIVATE_KEY" > ~/.ssh/id_ed25519
          chmod 600 ~/.ssh/id_ed25519

          scp -o StrictHostKeyChecking=no -r \
            package.json package-lock.json next.config.ts tsconfig.json \
            public/ src/ deploy/ \
            sk@100.108.60.90:~/local-ai-proxy-admin-frontend/

          ssh -o StrictHostKeyChecking=no sk@100.108.60.90 \
            "export KUBECONFIG=/home/sk/.kube/config && \
             sudo kubectl -n local-ai create secret generic admin-frontend-secret \
               --from-literal=AUTH_SECRET='${AUTH_SECRET}' \
               --dry-run=client -o yaml | sudo kubectl apply -f -"

          ssh -o StrictHostKeyChecking=no sk@100.108.60.90 SHORT_SHA="${SHORT_SHA}" bash << 'DEPLOY_EOF'
            export KUBECONFIG=/home/sk/.kube/config
            cd ~/local-ai-proxy-admin-frontend

            sudo docker build \
              --build-arg GIT_SHA="${SHORT_SHA}" \
              -f deploy/Dockerfile \
              -t "local-ai-proxy-admin-frontend:${SHORT_SHA}" \
              -t local-ai-proxy-admin-frontend:latest \
              .

            sudo docker save \
              "local-ai-proxy-admin-frontend:${SHORT_SHA}" \
              local-ai-proxy-admin-frontend:latest \
              | sudo k3s ctr images import -

            sudo kubectl apply -f deploy/k8s/service.yaml
            sudo kubectl apply -f deploy/k8s/ingress.yaml
            sudo kubectl apply -f deploy/k8s/deployment.yaml

            sudo kubectl -n local-ai set image deployment/admin-frontend \
              admin-frontend=local-ai-proxy-admin-frontend:${SHORT_SHA}
            sudo kubectl -n local-ai rollout status deployment/admin-frontend --timeout=180s
          DEPLOY_EOF
```

### 7. First-time deployment (ordered)

For the new frontend (and for setting up a fresh cluster from scratch), follow this order **once**:

1. **DNS**: add A record `admin.ai.kinvee.in` → dev-server public IP. Wait for propagation (usually <5 min).
2. **GitHub Actions secrets** (admin-frontend repo):
   - `TAILSCALE_OAUTH_CLIENT_ID`, `TAILSCALE_OAUTH_SECRET`
   - `DEV_SERVER_SSH_KEY`
   - `AUTH_SECRET` (32+ bytes, `openssl rand -base64 32`)
3. **Push `main`** → CI runs → CD runs → image built → k8s applied.
4. **Verify Traefik routing**: `curl -I https://admin.ai.kinvee.in` should return 307 to `/login` (or 200 if hitting the styleguide).
5. **Wait for TLS**: cert-manager provisions `admin-frontend-tls`; takes 30–120 seconds. `kubectl -n local-ai describe certificate admin-frontend-tls` confirms.
6. **First admin user (backend bootstrap)**:
   - Set `ADMIN_BOOTSTRAP_TOKEN` in backend GitHub Actions secrets (32+ random chars, e.g. `openssl rand -base64 32`).
   - Re-deploy backend (triggers CD).
   - Run:
     ```bash
     curl -X POST https://ai.kinvee.in/api/admin/bootstrap \
       -H 'Content-Type: application/json' \
       -d '{"token":"<token>","email":"you@kinvee.in","password":"<secure>","name":"Admin"}'
     ```
   - Expect 201.
   - **Rotate or unset** `ADMIN_BOOTSTRAP_TOKEN` from GitHub Actions secrets and re-deploy backend. This closes the endpoint until the next time you actively want to bootstrap (the same endpoint handles DR — see Disaster Recovery below).
7. **Log into the frontend** at `https://admin.ai.kinvee.in/login` with the email+password from step 6. Should land on the dashboard.

**Ordering for backend PR 0 rollout** (when going live with session-based admin auth on an existing cluster):
1. Merge BE PR 0 to main → CD deploys.
2. Verify existing admin scripts still work (`X-Admin-Key` path must remain functional).
3. Complete step 6 above to create your first admin user.
4. Only then merge FE PR B (which requires Bearer-path auth to function).

### 8. Rollout, probes, graceful shutdown

**Strategy**: `RollingUpdate` with `maxUnavailable: 0`, `maxSurge: 1`. Ensures at least one pod serving during deploy.

**Probes** already specified above. Key facts:
- Backend readiness checks DB + Ollama + usage writer (`/api/healthz/ready`). A DB blip makes the pod un-ready, traffic routes to healthy pods; no 5xx storm.
- Frontend readiness checks only the Next server is up (`/api/health`). The BFF's backend calls aren't in readiness — we don't want the frontend to flap when backend is briefly down.

**Graceful shutdown** (backend — already implemented in `cmd/proxy/main.go`):
- SIGTERM → stop accepting new connections → wait for in-flight requests (up to 30s) → drain usage channel → exit.
- k8s default `terminationGracePeriodSeconds=30` matches.

**Graceful shutdown** (frontend):
- Next's `server.js` handles SIGTERM cleanly by default.
- Set `terminationGracePeriodSeconds: 20` (frontend has no long-lived requests; 20s is plenty).

**Rollout command** (manual, if needed):
```bash
sudo kubectl -n local-ai rollout status deployment/ai-proxy
sudo kubectl -n local-ai rollout status deployment/admin-frontend
```

### 9. Observability integration

Both deployments emit structured JSON logs to stdout → Alloy (DaemonSet) collects → Loki. Prometheus scrapes `/metrics` (backend) via the `prometheus.io/scrape` annotations.

**Frontend does not expose `/metrics`** (v1). If demand arises, add a `/metrics` route handler returning Node process metrics via `prom-client`.

**Grafana dashboards** (shipped manually, tracked in `observability` repo):
- `ai-proxy` dashboard: request rate, p50/p95/p99 latency, token counts by model, credit balance per account, usage channel depth, rate-limit rejections, DB pool stats (from PR 6).
- `admin-frontend` dashboard: request rate from Loki logs, 5xx rate, auth failure rate.

**Alerts** (Grafana → Discord webhook). Metric names must match what the backend exports; PR 6 is responsible for creating any that don't exist yet:
- `increase(aiproxy_usage_drops_total[5m]) > 0` (critical) — **new counter added in PR 6** to replace today's log-only drop notification
- `aiproxy_ollama_up == 0` for 2min (critical) — existing metric name (not `_healthy`)
- `aiproxy_db_pool_idle_connections == 0` for 5min (warning) — gauge added in PR 6
- 5xx rate on admin-frontend > 1% for 5min (warning) — from Loki log rate (frontend has no `/metrics` in v1)
- Cert expiring in < 14 days (warning) — cert-manager usually auto-renews; alert catches failures

PR 6 explicitly adds `aiproxy_usage_drops_total` as a `prometheus.Counter` incremented in the `default:` branch of the channel-send select statement in `proxy.go:486-490`, alongside the existing `slog.Warn` log.

**Log correlation**: backend logs include `request_id`. Frontend BFF proxy should **preserve and forward** the request ID header from client to backend, and include it in its own logs. Adds the ability to trace a user click through to a specific backend request in Loki.

### 10. Rollback

**Backend**:
```bash
# Find previous image tag
sudo kubectl -n local-ai rollout history deployment/ai-proxy
# Revert
sudo kubectl -n local-ai rollout undo deployment/ai-proxy
# Or pin to a specific SHA
sudo kubectl -n local-ai set image deployment/ai-proxy \
  ai-proxy=local-ai-proxy:<previous-sha>
```

**Frontend**: same commands, substituting `admin-frontend` and `local-ai-proxy-admin-frontend`.

**Schema rollback**: DDL changes in `schema.sql` are all idempotent and forward-only. **There is no automatic backward migration**. If a PR introduces a breaking column/table change, the plan for backing it out is a hand-written reverse DDL noted in the PR description. Default posture: all schema changes are additive (new columns nullable or defaulted, new tables, new indexes) — no rollback needed on revert.

### 11. Disaster recovery

**Postgres** (lives in `aarogya` namespace, not managed by this project):
- Backups: whatever the aarogya setup provides (out of scope for this plan).
- Test recovery: quarterly drill — restore to a throwaway DB and smoke-test the backend.

**k3s cluster loss**:
- Secrets in GitHub Actions → re-deploy recreates them.
- Manifests in git → re-apply.
- Images need rebuild (no external registry) — automatic on CD re-run.
- Postgres data: whatever DR the aarogya setup provides.

**First admin lockout**:
- Set a fresh `ADMIN_BOOTSTRAP_TOKEN` in GitHub Actions secrets (new random value).
- Re-deploy backend (pod picks up the new env var).
- Run the bootstrap `curl` to create a fresh admin:
  ```bash
  curl -X POST https://ai.kinvee.in/api/admin/bootstrap \
    -H 'Content-Type: application/json' \
    -d '{"token":"<new-token>","email":"recovery@kinvee.in","password":"<secure>","name":"Recovery Admin"}'
  ```
- Expect 201. This works because bootstrap is **reusable** (locked decision #11) — there is no one-shot DB marker blocking subsequent invocations.
- Unset `ADMIN_BOOTSTRAP_TOKEN` from GitHub Actions secrets and re-deploy (endpoint returns 404 again).
- `X-Admin-Key` remains as an additional permanent fallback for scripts.

### 12. Resource budget

Total steady-state for the two new/updated deployments:

| Workload | Request mem | Limit mem | Request CPU | Limit CPU |
|---|---|---|---|---|
| `ai-proxy` (existing) | 32Mi | 128Mi | 50m | 200m |
| `admin-frontend` (new) | 128Mi | 256Mi | 50m | 200m |
| **Total additional** | +128Mi | +256Mi | +50m | +200m |

Cluster is a 32 GB RAM / i9 box — room to spare.

### 13. Checklist before going live

- [ ] DNS A record for `admin.ai.kinvee.in` created
- [ ] GitHub Actions secrets set in both repos (especially `AUTH_SECRET` for admin-frontend, `ADMIN_BOOTSTRAP_TOKEN` for backend)
- [ ] Backend PR 0 deployed and verified (existing `X-Admin-Key` path still works)
- [ ] First admin user bootstrapped, `ADMIN_BOOTSTRAP_TOKEN` removed
- [ ] Frontend PR A deployed, `/styleguide` loads with TLS
- [ ] Frontend PR B deployed, `/login` works end-to-end with the bootstrapped admin
- [ ] Grafana dashboards imported for both services
- [ ] Discord alerts configured for the alert rules above
- [ ] Runbook entry written: "How to rotate AUTH_SECRET" + "How to bootstrap a fresh admin"

---

## Next Steps

**Status (2026-04-15):** Backend sequence complete (BE 0–7 ✅). Frontend A–G merged. Only remaining work:

1. **FE H** (standalone) — polish pass: empty states on every list, `error.tsx` per route group, skeleton audit, axe E2E per page, CHANGELOG, README screenshots, keyboard shortcuts (`g u`, `g k`, `/`).

### Open for Future Review

- **Monorepo migration**: if user-frontend grows and shares ≥3 schemas with admin, revisit shared Zod package.
- **`credits_charged` backfill**: historical rows are `NOT NULL DEFAULT 0` (locked decision #16). They contribute `$0` to aggregates — accurate since no cost data exists for them. No backfill work.
- **Per-admin MFA**: add after session auth is stable.
- **Key search `?q=`**: revisit when key count exceeds 100.
- **User frontend**: separate planning effort at `local-ai-proxy-frontend` (greenfield, will share auth patterns from admin-frontend).
