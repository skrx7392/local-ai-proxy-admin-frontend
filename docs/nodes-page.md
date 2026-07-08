# Design note: Admin Nodes page (Distributed Nodes FE-1)

Companion to the backend design (`local-ai-proxy/docs/design/distributed-nodes.md`).
The page consumes `/api/admin/nodes` exactly as shipped — every response is the
`nodeDTO` (stored config, secrets masked, joined with live registry state).

## Page layout

`/nodes` follows the Pricing template: heading + "Register node" button, a
`DataTable` (name · backend type · health badge · models · source badge ·
enabled · last checked · row actions), and envelope-driven `Pagination` with
`limit`/`offset` in the URL. Feature code lives in `src/features/nodes/`
(schemas, hooks, columns, form dialog); the route is
`src/app/(admin)/nodes/page.tsx`; nav entry sits next to Pricing.

Row actions: **Refresh** (POST `/nodes/{id}/refresh`; the response carries the
node's freshly probed state, which is written straight into the react-query
list cache so the row updates in place), **Usage** (link to
`/usage?node_id={id}` — `node_id` is wired through the usage filter plumbing
like `account_id`), **Edit**, **Disable** (ConfirmDialog → DELETE; copy makes
the soft-delete semantics explicit — history kept, re-enable possible from the
edit dialog's status toggle, matching PUT `enabled: true` resurrection).

Zero state: `EmptyState` titled **"No nodes configured"** (same wording the
backend puts in the admin-health `warning`), explaining that chat requests 503
until a node serves the model, with a Register action and a pointer at
`NODES_FILE` / `OLLAMA_URL`.

## Health badge semantics

Three states, mapping the wire enum 1:1:

| state | color | meaning |
|---|---|---|
| `healthy` | green | last probe succeeded; node is routable |
| `unhealthy` | red | **confirmed down** — the poller applies hysteresis and only flips healthy → unhealthy after **2 consecutive probe failures**, so red is never a single flaked probe |
| `unknown` | gray | not probed yet (disabled, or registered before a probe reached it); treated as not routable |

The badge carries a native `title` tooltip with `last_checked_at` and, when
unhealthy, `last_error` plus the confirmed-down wording. The models cell is
truncated to two entries with the full list in its tooltip (`(static)` suffix
when `static_models` pins the list). The topbar HealthIndicator popover also
gained a per-node section (name, dot, model count or last error) plus the
zero-node `warning` — schema extended additively so pre-registry backends
still parse.

## Masked-secret UX (`auth_header`)

Reads always return a mask (`"Bearer sk-…abcd"`); the raw value is write-only.
The edit dialog therefore:

- shows the current masked value as display-only text (never in an input);
- offers a **Keep / Replace / Clear** segmented control (tri-state):
  - **Keep** (default) → `auth_header` is *absent* from the PUT body,
  - **Replace** → reveals an empty password input; the new raw value is sent
    (empty + Replace is a validation error, not an accidental clear),
  - **Clear** → sends `auth_header: ""`.
- The mask is **never** round-tripped: the form prefills the input with `""`,
  and `toUpdatePayload` only attaches `auth_header` for Replace/Clear.

Other PUT fields don't need the tri-state because they prefill losslessly:
the dialog always sends them, using the documented clear sentinels for empty
values (`static_models: []` → back to discovery, `health_path: ""` → clear,
`timeout_seconds: 0` → 5-minute default). `enabled` is an explicit toggle so
editing a disabled node can resurrect it.

## Config-sourced nodes (read-only)

Nodes with `source: "config"` (from `NODES_FILE` or `OLLAMA_URL`) get a purple
**config** badge whose tooltip — like the disabled Edit/Disable buttons' —
points at `NODES_FILE` ("managed by the nodes config file, read-only via the
admin API"). Refresh and the Usage link stay active (both are safe on config
nodes). If a mutation reaches the backend anyway it answers
`409 config_sourced_node`; the dialog surfaces that message verbatim, same as
name-conflict 409s and validation 400s.

## Known backend gap (follow-up)

`node_id` is accepted by legacy `GET /api/admin/usage` only; the analytics
endpoints the Usage page is built on (`/usage/summary`, `/by-model`,
`/by-user`, `/timeseries`) ignore it today. The FE wires `node_id` end-to-end
(URL ⇄ filters ⇄ wire param, visible in the Advanced filter row) so the
per-node link round-trips and filtering lights up as soon as the backend adds
`node_id` to the analytics queries — tracked as a backend follow-up.
