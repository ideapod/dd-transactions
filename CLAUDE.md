# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A MERN-stack app for **data-driven transactions** — forms whose fields are defined by schemas stored in MongoDB. Users create **transaction definitions** (TxnDefs) that contain a `@data-driven-forms` schema, then fill out **transactions** whose fields are dynamically rendered from those schemas.

Originally developed in AWS Cloud9 against Amazon DocumentDB; migrated to self-hosted MongoDB running in Docker.

## Project Layout

```
mern/
  client/   React + Vite frontend (port 8081)
  server/   Express backend (port 5050)
mongo/
  restore.sh   Auto-runs mongorestore on first container start
dump/
  employees/   mongodump of the live data (txndefs, transactions, records)
```

## Commands

### Docker (preferred for local dev)
```bash
docker compose up --build          # build and start all services
docker compose up --build client   # rebuild only the client (e.g. after npm install)
docker compose down -v             # stop and wipe volumes (requires data restore after)

# Restore data after first start or after down -v
docker compose exec mongo mongorestore --noOptionsRestore --gzip /dump
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
Reads `mern/server/config.env` for `MONGO_URI` and `PORT`. In Docker, these are injected via `docker-compose.yml` and `config.env` is not used.

### Client
API base URL is set via `VITE_SERVER_URL` (e.g. `http://localhost:5050`). Falls back to `http://localhost:5050` if unset. In Docker this is passed as an environment variable in `docker-compose.yml`. Vite bakes this into the bundle at startup — changing it requires a container restart.

## Database

MongoDB database: `employees`
Collections: `txndefs`, `transactions`, `records`

The `dump/` directory contains a `mongodump` of the original DocumentDB data. Restore with `--noOptionsRestore --gzip` to skip DocumentDB-specific metadata and handle compressed files.

## Architecture

### Data Model

**TxnDef** (`txndefs` collection):
- `name`, `version` — metadata
- `schema` — a `@data-driven-forms` schema object, defines the fields for a form

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

### JSON Schema Editor

`TxnDefForm` uses `@uiw/react-codemirror` with `@codemirror/lang-json` for editing schemas. The schema is stored as a JS object in state; it is serialised with `JSON.stringify` when passed to the editor and parsed with `JSON.parse` on change (errors are silently swallowed while the user is mid-edit).

### Backend Routes

All routes follow standard REST CRUD on their collections:
- `GET /txndef` / `GET /txndef/:id`
- `POST /txndef`, `PATCH /txndef/:id`, `DELETE /txndef/:id`
- Same pattern for `/transaction` and `/record`
