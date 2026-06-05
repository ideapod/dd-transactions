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
    routes/ record.js, txndef.js, transaction.js, payment.js
    lib/    webhook.js helper
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
docker compose down -v             # stop and wipe volumes (requires data restore after)

# Restore data after first start or after down -v
docker compose exec mongo mongorestore --noOptionsRestore --gzip /dump

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
```

### Client
API base URL is set via `VITE_SERVER_URL` (e.g. `http://localhost:5050`). Falls back to `http://localhost:5050` if unset. Vite bakes this into the bundle at startup — changing it requires a container restart.

## Database

MongoDB database: `employees`
Collections: `txndefs`, `transactions`

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

### 3rd-party API

- `GET /api/transactions/:txndefid` — returns all `complete` and `free` transactions for a TxnDef. Open, no auth.
- Outbound webhook: if `webhook_url` is set on a TxnDef, the server POSTs transaction data on completion. Implemented in `mern/server/lib/webhook.js`.

### Key Design Pattern: `TransactionForm`

`TransactionForm` is the core component. On load it:
1. Fetches the TxnDef by ID
2. Patches the schema to inject `PaymentSummary` into any payment steps
3. Passes the schema to `@data-driven-forms` `FormRenderer`
4. On submit, forks: paid → Stripe redirect, free → direct save

### JSON Schema Editor

`TxnDefForm` uses `@uiw/react-codemirror` with `@codemirror/lang-json`. Schema stored as JS object; serialised with `JSON.stringify` in, parsed with `JSON.parse` out (errors silently swallowed while mid-edit).

### MUI Theme

A custom MUI theme is defined in `mern/client/src/theme.js` and applied via `ThemeProvider` in `main.jsx`. It styles all `@data-driven-forms/mui-component-mapper` form fields automatically. Design tokens are sourced from the VIC government design system (`service.vic.gov.au`):

| Token | Value |
|---|---|
| Primary (orange) | `#e3710a` |
| Primary hover | `#9d5b00` |
| Body text | `#3c4a60` |
| Font | Verdana, Helvetica, sans-serif |
| Border radius | 2px |

To adjust the form appearance, edit `theme.js` — changes cascade to all MUI components including form fields, buttons, and labels.

### Backend Routes

| Route | Purpose |
|---|---|
| `GET/POST /txndef`, `GET/PATCH/DELETE /txndef/:id` | TxnDef CRUD |
| `GET/POST /transaction`, `GET/PATCH/DELETE /transaction/:id` | Transaction CRUD |
| `POST /payment/create-checkout-session` | Create Stripe Checkout session, save pending transaction |
| `POST /payment/webhook` | Stripe webhook — marks transaction complete, fires outbound webhook |
| `GET /payment/session-status` | Check Stripe session status by session_id |
| `GET /api/transactions/:txndefid` | 3rd-party pull API |

Note: `/payment/webhook` requires raw body for Stripe signature verification — mounted before `express.json()` in `server.js`.
