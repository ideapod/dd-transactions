# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A MERN-stack app for **data-driven transactions** — forms whose fields are defined by schemas stored in MongoDB (Amazon DocumentDB). Users create **transaction definitions** (TxnDefs) that contain a `@data-driven-forms` schema, then fill out **transactions** whose fields are dynamically rendered from those schemas.

The app was developed in an AWS Cloud9 environment and targets an Amazon DocumentDB cluster.

## Project Layout

```
mern/
  client/   React + Vite frontend (port 5173 dev)
  server/   Express backend (port 5050)
```

## Commands

### Server
```bash
cd mern/server
npm install
node --env-file=config.env server.js   # start server
```

### Client
```bash
cd mern/client
npm install
npm run dev       # dev server
npm run build     # production build
npm run lint      # ESLint
```

No test runner is configured for either package.

## Environment & Database

The server reads `mern/server/config.env` for `DOCDB_URI` and `PORT`. The connection uses TLS with `global-bundle.pem` (Amazon DocumentDB CA bundle) located in `mern/server/`.

Database: `employees`  
Collections: `txndefs`, `transactions`, `records`

## Architecture

### Data Model

**TxnDef** (`txndefs` collection):
- `name`, `version` — metadata
- `schema` — a `@data-driven-forms` schema object (JSON), defines the fields for a form

**Transaction** (`transactions` collection):
- `schema_id` — ObjectId reference to a TxnDef
- `name`, `created`, `modified`
- `data` — the submitted form values object

### Frontend Routes → Components

| Route | Component | Purpose |
|---|---|---|
| `/txndefs` | `TxnDefList` | Browse/delete transaction definitions |
| `/txndefs/create` | `TxnDefForm` | Create a new TxnDef with JSON schema editor |
| `/txndefs/edit/:id` | `TxnDefForm` | Edit existing TxnDef |
| `/transactions` | `TransactionList` | Browse/delete transactions |
| `/transactions/create/:txndefid` | `TransactionForm` | Fill a new form driven by TxnDef schema |
| `/transactions/edit/:id` | `TransactionForm` | Edit an existing transaction |
| `/` | `RecordList` | Legacy employee records list |

### Key Design Pattern: `TransactionForm`

`TransactionForm` is the core component. On load it:
1. Fetches the TxnDef by ID (either from `params.txndefid` for new, or from the transaction's `schema_id` for edit)
2. Passes `txndef.schema` to `@data-driven-forms` `FormRenderer`, which dynamically renders the form fields
3. On submit, writes the form values to the `transactions` collection via the REST API

### API Base URL

Both `TransactionForm` and `TxnDefForm` hardcode `serverURL = "http://52.62.121.255:8080"` — this is the EC2 instance address. Change this if the server moves.

### Backend Routes

All routes follow standard REST CRUD on their collections:
- `GET /txndef` / `GET /txndef/:id`
- `POST /txndef`, `PATCH /txndef/:id`, `DELETE /txndef/:id`
- Same pattern for `/transaction` and `/record`
