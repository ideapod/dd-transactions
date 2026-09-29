# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A MERN-stack app for **data-driven transactions** — forms whose fields are defined by schemas stored in MongoDB. Users create **transaction definitions** (TxnDefs) that contain a `@data-driven-forms` schema, then fill out **transactions** whose fields are dynamically rendered from those schemas. Forms support multi-step wizards, Stripe payments, a 3rd-party pull API, and outbound webhooks.

Originally developed in AWS Cloud9 against Amazon DocumentDB; migrated to self-hosted MongoDB running in Docker.

## Project Layout

```
mern/
  client/   React + Vite frontend (port 8081)
  server/   Express backend (port 5050)
    routes/ record.js, txndef.js, transaction.js, payment.js, apikey.js
    lib/    apiKeys.js, connections.js, webhook.js, secrets.js, schemaValidator.js
    mcp/    server.js (MCP server at /mcp), schema-guide.md (served to LLMs)
    scripts/ create-api-key.js
mongo/
  restore.sh   Auto-runs mongorestore on first container start
dump/
  employees/   mongodump of the live data (txndefs, transactions)
bruno/
  dd-transactions/   Bruno API collection (open in Bruno app)
```

## Commands

### Docker (preferred for local dev)
```bash
docker compose up --build          # build and start all services
docker compose up --build client   # rebuild only the client (e.g. after npm install)
docker compose down -v             # stop and wipe volumes (next `up` auto-restores dump/)

# Data in dump/ is restored automatically whenever the mongo volume is empty
# (first start, or after down -v). To reset an existing volume back to the dump:
docker compose exec mongo mongorestore --drop --noOptionsRestore --gzip /dump

# Stripe webhook forwarding (separate terminal, required for payment flows)
stripe listen --forward-to localhost:5050/payment/webhook
```

### Server (without Docker)
```bash
cd mern/server
npm install
node --env-file=config.env server.js
```

### Client (without Docker)
```bash
cd mern/client
npm install
npm run dev       # dev server on port 8081
npm run build     # production build
npm run lint      # ESLint
```

No test runner is configured for either package.

## Environment

### Server
In Docker, env vars are injected via `docker-compose.yml` which reads from `.env` in the project root:
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...   # printed by `stripe listen`
SECRETS_KEY=...                   # AES key material for stored webhook secrets/headers (dev fallback + warning if unset)
WEBHOOK_ALLOW_PRIVATE=false       # true permits webhook URLs on private/loopback IPs (local testing)
```

### Client
API base URL is set via `VITE_SERVER_URL` (e.g. `http://localhost:5050`). Falls back to `http://localhost:5050` if unset. Vite bakes this into the bundle at startup — changing it requires a container restart.

## Database

MongoDB database: `employees`
Collections: `txndefs`, `transactions`, `api_keys`, `connections`

The `dump/` directory contains a `mongodump` of the original data. Restore with `--noOptionsRestore --gzip`.

## Architecture

### Data Model

**TxnDef** (`txndefs` collection):
- `name`, `version` — metadata
- `schema` — a `@data-driven-forms` schema object, defines the form fields and steps
- `webhook_url` — optional URL to POST to when a transaction completes

**Transaction** (`transactions` collection):
- `schema_id` — ObjectId reference to a TxnDef
- `name`, `created`, `modified`
- `data` — submitted form values
- `status` — `"free"` | `"pending"` | `"complete"`
- `stripe_session_id`, `payment_amount` — set for paid transactions

### Multi-step forms

The `@data-driven-forms` `wizard` component is used natively. Steps are declared in the TxnDef schema. No code changes needed — just author the schema with a `wizard` field:

```json
{
  "fields": [{
    "component": "wizard",
    "name": "wizard",
    "fields": [
      { "name": "step-1", "title": "Details", "fields": [...], "nextStep": "step-2" },
      { "name": "step-2", "title": "Confirm", "fields": [...] }
    ]
  }]
}
```

### Payment step

A payment step is declared inside the wizard schema with `"type": "payment"`. `TransactionForm` detects it, shows a read-only confirmation summary (`PaymentSummary.jsx`), and on submit redirects to Stripe Checkout. No `price_cents` or payment fields on the TxnDef document itself.

```json
{
  "name": "payment",
  "title": "Payment",
  "type": "payment",
  "amount_cents": 5000,
  "currency": "aud",
  "description": "Registration fee"
}
```

Payment flow: form submit → `POST /payment/create-checkout-session` → Stripe hosted page → Stripe webhook → `POST /payment/webhook` marks transaction `complete` → outbound webhook fires.

Free forms (no payment step) save directly with `status: "free"`.

### 3rd-party API, MCP server and API keys

**Auth model:** `/api/*` and `/mcp` require `Authorization: Bearer ddt_...`, checked by `requireApiKey(...scopes)` in `lib/apiKeys.js`. Keys live in `api_keys`, stored as a SHA-256 hash only, with `scopes` and an optional `txndef_ids` restriction (`null` means all). Every TxnDef/transaction lookup made for a key must go through `canAccessTxnDef`. Scopes: `txndefs:read`, `txndefs:write`, `transactions:read`, `connections:manage`. Keys are issued from the `/apikeys` admin page or `scripts/create-api-key.js`.

The admin UI routes (`/txndef`, `/transaction`, `/apikey`, `/payment/*`) are still **unauthenticated**. User login is a planned follow-up.

Other known gaps (see README "Security model summary"): no OAuth for MCP (bearer keys only), no webhook retries or delivery log, no rate limiting, and the SSRF check is open to DNS rebinding. TxnDefs whose `webhook_url` predates signing deliver unsigned until a secret is generated.

When adding an MCP tool: register it inside the right `has(scope)` block in `mcp/server.js`, load TxnDefs through `loadTxnDef` (it enforces the key's TxnDef restriction), throw `ToolError` for errors the model should see, and add it to the README tool table.

- `GET /api/transactions/:txndefid` — `complete` and `free` transactions for a TxnDef. Scope `transactions:read`.
- `POST /mcp` — MCP server (`mcp/server.js`), Streamable HTTP in stateless mode (new `McpServer` per request). Tools are registered only if the key has the scope they need. `create_txndef`/`update_txndef` run `lib/schemaValidator.js` first. Update `mcp/schema-guide.md` and `COMPONENTS` in the validator whenever custom components change.
- Outbound webhook: `webhook_url` stays on the TxnDef. Signing secret and custom headers live in the `connections` collection (one doc per TxnDef, AES-GCM encrypted via `lib/secrets.js`) so secrets never appear in TxnDef responses. `lib/webhook.js` signs each delivery (`X-DDT-Signature: t=..,v1=HMAC-SHA256("<t>.<body>")`). `assertPublicUrl` rejects private/loopback/link-local targets when a URL is saved and again at delivery time.

### Key Design Pattern: `TransactionForm`

`TransactionForm` is the core component. On load it:
1. Fetches the TxnDef by ID
2. Patches the schema to inject `PaymentSummary` into any payment steps
3. Passes the schema to `@data-driven-forms` `FormRenderer`
4. On submit, forks: paid → Stripe redirect, free → direct save

### JSON Schema Editor

`TxnDefForm` uses `@uiw/react-codemirror` with `@codemirror/lang-json`. Schema stored as JS object; serialised with `JSON.stringify` in, parsed with `JSON.parse` out (errors silently swallowed while mid-edit).

### MUI Theme & Visual Style

The app is styled to match the **Service Victoria** design system. The MUI theme is defined in `mern/client/src/theme.js` and applied via `ThemeProvider` in `main.jsx`. Global CSS overrides live in `mern/client/src/index.css`.

#### Design tokens

| Token | Value |
|---|---|
| Primary (orange) | `#e3710a` |
| Primary hover | `#9d5b00` |
| Body text | `#3c4a60` |
| Page background | `#f4f4f4` |
| Font | Verdana, Helvetica, sans-serif |
| Border radius | 2px |

#### Typography scale

| Variant | Size | Use |
|---|---|---|
| `h1` | 1.75rem | Page-level schema titles (e.g. form name in card) |
| `h2` | 1.5rem | Section headings |
| `h3` | 1.3rem | Sub-section headings |
| `h4` | 1.1rem | Field group headings |
| `h5` | 1.0rem | Minor headings |
| `body1` | 0.875rem | Standard body text |
| Tab labels | 0.95rem | Set in `MuiTab` theme override |
| Banner title | 1.6rem | Orange hero banner in `TransactionForm` |

#### Transaction form layout

`TransactionForm` renders a **Service Victoria–style page**:
- Full-width **orange hero banner** at the top with the form name
- White **card** (`Paper`) centred on a grey (`#f4f4f4`) background
- Single row of wizard nav buttons only (outer submit/cancel suppressed for wizard forms via `showFormControls={!isWizard}`)

#### Tab styling

`@data-driven-forms` renders its `tabs` component inside a `MuiAppBar` (`<header>`). The theme overrides `MuiAppBar` (white background, no shadow) and `MuiTabs`/`MuiTab` to produce SV-style tabs:
- Full-width tabs (`variant: 'fullWidth'`)
- Orange 4px indicator bar at the **top** of the active tab
- Vertical dividers between tabs
- Active tab: orange text; inactive: dark grey

#### Custom components in `componentMapper`

Beyond the standard `@data-driven-forms` MUI components, `TransactionForm` registers:

| Component name | File | Purpose |
|---|---|---|
| `payment-summary` | `PaymentSummary.jsx` | Read-only payment amount display on the payment wizard step |
| `bullet-list` | inline in `TransactionForm.jsx` | Renders a `<ul>` bullet list from an `items` array |

**`bullet-list` schema usage:**
```json
{
  "component": "bullet-list",
  "name": "my-list",
  "items": [
    "First item",
    "Second item",
    "Third item"
  ]
}
```

#### CSS overrides (`index.css`)

Two global rules patch `@data-driven-forms` layout quirks:

1. **`FormFieldGrid-grid`** — forces all field wrappers to full row width (prevents unintended side-by-side layouts).
2. **Bare typography in `MuiGrid-container`** — `h1`–`h6`, `p`, `ul`, `body1` elements that `@data-driven-forms` drops directly into flex grid containers (without a grid-item wrapper) are forced to `flex-basis: 100%` so they stack vertically instead of flowing inline.

To adjust the form appearance, edit `theme.js` — changes cascade to all MUI components including form fields, buttons, and labels.

### Backend Routes

| Route | Purpose |
|---|---|
| `GET/POST /txndef`, `GET/PATCH/DELETE /txndef/:id` | TxnDef CRUD |
| `GET/POST /transaction`, `GET/PATCH/DELETE /transaction/:id` | Transaction CRUD |
| `POST /payment/create-checkout-session` | Create Stripe Checkout session, save pending transaction |
| `POST /payment/webhook` | Stripe webhook — marks transaction complete, fires outbound webhook |
| `GET /payment/session-status` | Check Stripe session status by session_id |
| `GET/PUT /txndef/:id/connection`, `POST /txndef/:id/connection/test` | Webhook signing secret, custom headers, test delivery |
| `GET/POST /apikey`, `DELETE /apikey/:id`, `GET /apikey/scopes` | API key admin (DELETE = revoke) |
| `GET /api/transactions/:txndefid` | 3rd-party pull API (bearer key) |
| `POST /mcp` | MCP server (bearer key) |

Note: `/payment/webhook` requires raw body for Stripe signature verification — mounted before `express.json()` in `server.js`.
