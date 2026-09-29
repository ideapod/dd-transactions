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

On first run (or after `docker compose down -v`), the MongoDB volume is empty and `mongo/restore.sh` automatically restores the included data dump from `dump/`.

To reset an existing volume back to the dump:

```bash
docker compose exec mongo mongorestore --drop --noOptionsRestore --gzip /dump
```

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
SECRETS_KEY=<long random string>   # encrypts stored webhook secrets/headers — e.g. `openssl rand -base64 32`
WEBHOOK_ALLOW_PRIVATE=false        # true lets webhooks target localhost/private IPs (local testing only)
```

If `SECRETS_KEY` is unset the server uses an insecure development key and logs a warning. Changing it later makes stored webhook secrets and headers unreadable, so they would need to be configured again.

## Project structure

```
mern/
  client/       React + Vite frontend (port 8081)
  server/       Express backend (port 5050)
    routes/     txndef.js, transaction.js, payment.js, apikey.js
    lib/        apiKeys.js, connections.js, webhook.js, secrets.js, schemaValidator.js
    mcp/        MCP server (server.js) + schema-guide.md served to LLMs
    scripts/    create-api-key.js
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

### API keys

The pull API and MCP server need a bearer API key: `Authorization: Bearer ddt_...`.

Issue keys from **Integrations → API Keys** in the admin UI, or from the command line (useful for the first key):

```bash
docker compose exec server node scripts/create-api-key.js --name "Claude Desktop" \
  --scopes txndefs:read,txndefs:write,transactions:read,connections:manage
```

Add `--txndefs <id>,<id>` to limit a key to specific TxnDefs. A limited key sees nothing else and can't create new TxnDefs.

| Scope | Allows |
|---|---|
| `txndefs:read` | List and read TxnDefs |
| `txndefs:write` | Create and update TxnDefs |
| `transactions:read` | Read submitted transactions (pull API + MCP) |
| `connections:manage` | Configure outbound webhooks and their credentials |

Only a SHA-256 hash of each key is stored, and the key is shown once when it's created. Revoking a key takes effect immediately.

> The admin UI and its routes (`/txndef`, `/transaction`, `/apikey`) are **not yet behind a login**. Don't expose port 5050 or 8081 publicly until they are.

### Pull API

```
GET http://localhost:5050/api/transactions/:txndefid
Authorization: Bearer ddt_...
```

Returns `complete` and `free` transactions and needs the `transactions:read` scope.

### MCP server

`POST http://localhost:5050/mcp` uses the Streamable HTTP transport and the same bearer key. An LLM client can use it to author forms, read responses and wire up third-party systems. A key only gets the tools its scopes allow:

| Tool | Scope |
|---|---|
| `get_schema_guide` | any |
| `list_txndefs`, `get_txndef` | `txndefs:read` |
| `create_txndef`, `update_txndef` (schemas are validated first) | `txndefs:write` |
| `list_transactions`, `get_transaction` | `transactions:read` |
| `get_connection`, `configure_connection`, `test_connection` | `connections:manage` |

Claude Code:

```bash
claude mcp add --transport http dd-transactions http://localhost:5050/mcp --header "Authorization: Bearer ddt_..."
```

For clients that only support stdio (e.g. Claude Desktop's config file), bridge with `npx mcp-remote http://localhost:5050/mcp --header "Authorization: Bearer ddt_..."`.

Example prompts once connected:

- "Make a 3-step volunteer registration form with a $25 AUD fee."
- "Show me this week's responses to the DWRS form."
- "Send completed responses to https://crm.example.com/hooks/intake with the header `Authorization: Bearer <crm token>`, then send a test event."

The server is stateless: every request builds a fresh MCP server scoped to the calling key, so `GET`/`DELETE /mcp` return 405. Each created or listed TxnDef includes a `form_url` the LLM can hand out to people who need to fill in the form.

### Outbound webhooks

Set a webhook URL on the TxnDef and the server POSTs a `transaction.completed` event each time a transaction completes. Configure it on the TxnDef edit page (**Outbound connection**) or with the `configure_connection` MCP tool.

Each delivery is signed with a per-TxnDef secret, which is shown once when it's generated or rotated:

```
X-DDT-Event: transaction.completed
X-DDT-Delivery: <uuid>
X-DDT-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256(secret, "<t>.<raw body>")>
```

Body:

```json
{
  "event": "transaction.completed",
  "delivery_id": "<uuid>",
  "txndef_id": "...",
  "txndef_name": "...",
  "transaction": { "_id": "...", "name": "...", "created": 0, "modified": 0, "data": { }, "payment_amount": null, "status": "free" }
}
```

`test_connection` and the **Send test event** button send a `webhook.test` event with the same signing.

Receivers should recompute the HMAC over the raw body, compare in constant time, and reject old timestamps. Node example:

```js
import crypto from "node:crypto";

function verify(rawBody, signatureHeader, secret, toleranceSeconds = 300) {
  const parts = Object.fromEntries(signatureHeader.split(",").map((p) => p.split("=")));
  if (Math.abs(Date.now() / 1000 - Number(parts.t)) > toleranceSeconds) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${parts.t}.${rawBody}`).digest("hex");
  return parts.v1.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(parts.v1), Buffer.from(expected));
}
```

Custom headers, such as an `Authorization` token for the target system, can be added too. They're stored encrypted and are never shown again. Set a header to `null` through the API or MCP, or click **remove** in the UI, to delete it.

Webhook URLs must be `http(s)`. URLs that resolve to private, loopback, link-local (including cloud metadata `169.254.169.254`) or reserved addresses are rejected when saved and again before each delivery. Redirects are not followed, and deliveries time out after 10 seconds. For local testing against a receiver on your machine, set `WEBHOOK_ALLOW_PRIVATE=true`.

TxnDefs whose `webhook_url` was set before signing existed have no secret, so their deliveries go out **unsigned** until you click **Generate secret** or call `configure_connection`.

### Security model summary

| Surface | Protection |
|---|---|
| `GET /api/transactions/:id` | Bearer API key with `transactions:read`, plus the key's TxnDef restriction |
| `POST /mcp` | Bearer API key; tools filtered by scope; TxnDef restriction on every lookup |
| `POST /payment/webhook` | Stripe signature (`STRIPE_WEBHOOK_SECRET`) |
| Outbound webhooks | HMAC-SHA256 signature per TxnDef, optional custom auth headers, SSRF blocking |
| Stored secrets | API keys: SHA-256 hash only. Webhook secrets and headers: AES-256-GCM with `SECRETS_KEY` |
| Admin UI routes (`/txndef`, `/transaction`, `/apikey`, `/payment/create-checkout-session`) | **None yet.** Needs a user login (follow-up) |

Known limitations:

- **No admin login.** Anyone who can reach port 5050 can use the admin routes, including issuing API keys. Keep the ports private.
- **No OAuth.** MCP clients that require OAuth 2.1, such as claude.ai custom connectors, can't connect yet. Claude Code, Claude Desktop (via `mcp-remote`) and most other clients work with a bearer header.
- **DNS rebinding.** The SSRF check resolves the hostname before sending, but the HTTP client resolves it again. A hostile DNS server could return a public address for the check and a private one for the send. Fully closing this means pinning the checked IP in the HTTP client.
- **No retries or delivery log.** Failed webhooks are logged to the server console and not retried.
- **No rate limiting** on `/api` or `/mcp`.

## API collection

A [Bruno](https://www.usebruno.com/) collection is in `bruno/dd-transactions/`. Open it in Bruno, select the **local** environment, set `txnDefId` to the ID from the TxnDef edit page URL, and set `apiKey` to a key with the `transactions:read` scope.

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
