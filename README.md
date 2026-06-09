# Dynamic Transaction Builder

A MERN-stack app for building and filling dynamic forms. You define a **transaction definition** (TxnDef) by writing a `@data-driven-forms` JSON schema, then create **transactions** by filling out the form that schema generates. Forms support multi-step wizards, Stripe payments, a 3rd-party pull API, and outbound webhooks.

## Stack

- **Frontend:** React + Vite, MUI (themed to VIC government design system), `@data-driven-forms`, CodeMirror 6
- **Backend:** Express (Node.js)
- **Database:** MongoDB

## Running locally with Docker

```bash
docker compose up --build
```

- Client: http://localhost:8081
- Server: http://localhost:5050

On first run, MongoDB starts empty. Restore the included data dump:

```bash
docker compose exec mongo mongorestore --noOptionsRestore --gzip /dump
```

> If you've previously run `docker compose down -v`, the volume is wiped and you'll need to restore again.

### Backing up and restoring MongoDB

**Backup** — dumps the `employees` database to a timestamped gzip archive in `dump/`:

```bash
docker compose up -d mongo   # start mongo if not already running
docker compose exec mongo mongodump --db employees --gzip --archive > dump/backup-$(date +%Y%m%d-%H%M%S).gz
```

**Restore** — replays a specific backup file (replace the filename as needed):

```bash
docker compose exec -T mongo mongorestore --db employees --gzip --archive < dump/backup-20260609-202019.gz
```

Add `--drop` before `--db` to wipe existing collections before restoring (safe point-in-time rollback):

```bash
docker compose exec -T mongo mongorestore --drop --db employees --gzip --archive < dump/backup-20260609-202019.gz
```

> Backup files are gitignored by default — store them somewhere safe if you need them long-term.

### Stripe (for payment forms)

Copy `.env.example` to `.env` and add your Stripe test keys, then in a separate terminal:

```bash
stripe listen --forward-to localhost:5050/payment/webhook
```

The `stripe listen` command prints a `whsec_...` secret — paste that into `.env` as `STRIPE_WEBHOOK_SECRET` and restart the server container.

## Environment variables

Create a `.env` file in the project root (gitignored):

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Project structure

```
mern/
  client/       React + Vite frontend (port 8081)
  server/       Express backend (port 5050)
    routes/     txndef.js, transaction.js, payment.js
    lib/        webhook.js — outbound webhook helper
mongo/
  restore.sh    Runs mongorestore on first container start
dump/
  employees/    mongodump of txndefs and transactions
bruno/
  dd-transactions/   Bruno API collection
```

## How it works

1. Create a **TxnDef** at `/txndefs/create` — give it a name, version, and a `@data-driven-forms` schema (JSON)
2. From the TxnDef list, click **Create Transaction** to fill out the generated form
3. Submitted transactions are stored with a reference back to their TxnDef schema

## Multi-step forms

Use the `@data-driven-forms` `wizard` component in your schema. Steps and fields are defined in the JSON — no code changes needed:

```json
{
  "fields": [{
    "component": "wizard",
    "name": "wizard",
    "fields": [
      { "name": "step-1", "title": "Your details", "fields": [...], "nextStep": "step-2" },
      { "name": "step-2", "title": "Confirm", "fields": [...] }
    ]
  }]
}
```

## Payment forms

Add a payment step anywhere in the wizard with `"type": "payment"`:

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

The form will show a confirmation summary of collected data, then redirect to Stripe Checkout on submit. Test with card `4242 4242 4242 4242`, any future expiry, any CVC.

## 3rd-party API

Retrieve completed transactions for a TxnDef (open, no auth):

```
GET http://localhost:5050/api/transactions/:txndefid
```

To receive a webhook when a transaction completes, set `webhook_url` on the TxnDef. The server will POST the transaction data to that URL.

## API collection

A [Bruno](https://www.usebruno.com/) collection is in `bruno/dd-transactions/`. Open it in Bruno, select the **local** environment, and set `txnDefId` to the ID from the TxnDef edit page URL.

## Custom schema components

Beyond the standard `@data-driven-forms` MUI components, the following are registered in `TransactionForm.jsx`:

### `bullet-list`

Renders a proper `<ul>` bullet list. Use this instead of multiple `plain-text` fields for list content.

```json
{
  "component": "bullet-list",
  "name": "requirements",
  "items": [
    "Prove your identity",
    "Agree to a national police check if required",
    "Provide relevant documents"
  ]
}
```

### `payment-summary`

Injected automatically by `TransactionForm` into payment wizard steps — do not use directly in schemas.

### Tabs inside a step

The standard `tabs` component renders SV-style tabbed panels within a wizard step:

```json
{
  "component": "tabs",
  "name": "info-tabs",
  "fields": [
    {
      "name": "tab-before", "title": "Before you start",
      "fields": [
        { "component": "plain-text", "name": "intro", "label": "How to register", "variant": "h4" },
        { "component": "bullet-list", "name": "steps", "items": ["Step one", "Step two"] }
      ]
    },
    { "name": "tab-faq", "title": "FAQ", "fields": [] }
  ]
}
```

## Styling

The app is styled to match [service.vic.gov.au](https://www.service.vic.gov.au). The MUI theme is in `mern/client/src/theme.js`; global layout fixes are in `mern/client/src/index.css`.

### Design tokens

| Token | Value |
|---|---|
| Primary orange | `#e3710a` |
| Primary hover | `#9d5b00` |
| Body text | `#3c4a60` |
| Page background | `#f4f4f4` |
| Font | Verdana, Helvetica, sans-serif |
| Border radius | 2px |

### Typography scale

| Variant | Size | Use |
|---|---|---|
| Banner title | 1.6rem bold | Orange hero header |
| `h1` | 1.75rem | Schema page/form title |
| `h2` | 1.5rem | Section headings |
| `h3` | 1.3rem | Sub-section headings |
| `h4` | 1.1rem | Field group / tab panel headings |
| `h5` | 1.0rem | Minor headings |
| Tab labels | 0.95rem | Above body, below headings |
| `body1` | 0.875rem | Standard body text |

### Transaction form page layout

Each transaction renders as a Service Victoria–style page:
- Full-width **orange hero banner** with the form name
- White **card** (`Paper`) centred on a grey (`#f4f4f4`) background
- Wizard navigation only (Continue / Back / Cancel) — outer submit/cancel row is suppressed for wizard forms

### Tab styling

`@data-driven-forms` wraps `tabs` in a `MuiAppBar`. The theme overrides this to produce SV-style tabs:
- Full-width equal tabs (`variant: 'fullWidth'`)
- **4px orange bar at the top** of the active tab
- Vertical dividers between tabs, orange text on active tab

### Known layout quirks & fixes (`index.css`)

`@data-driven-forms` has two layout quirks that are patched globally:

1. **`FormFieldGrid-grid`** — field wrappers don't always take full row width; forced to `flex-basis: 100%`.
2. **Bare typography in flex containers** — `plain-text` and custom components render `h1`–`h6`, `p`, `ul` etc. as direct children of `MuiGrid-container` (a flex container) without grid-item wrappers, causing them to flow side-by-side. Fixed by forcing `flex-basis: 100%` on those elements.

The `@data-driven-forms` schema format is documented at https://data-driven-forms.org/
