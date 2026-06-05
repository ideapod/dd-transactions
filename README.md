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

## Styling

Form fields are styled via a custom MUI theme (`mern/client/src/theme.js`) based on the [VIC government design system](https://service.vic.gov.au). To adjust the appearance, edit `theme.js`.

The `@data-driven-forms` schema format is documented at https://data-driven-forms.org/
