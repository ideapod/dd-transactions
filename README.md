# Data-Driven Transactions

A MERN-stack app for building and filling dynamic forms. You define a **transaction definition** (TxnDef) by writing a `@data-driven-forms` JSON schema, then create **transactions** by filling out the form that schema generates. No code changes needed to add a new form type — just create a new TxnDef.

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

## Running without Docker

### Server
```bash
cd mern/server
npm install
node --env-file=config.env server.js
```

### Client
```bash
cd mern/client
npm install
npm run dev
```

Set `VITE_SERVER_URL` in your environment (or a `.env` file in `mern/client/`) to point at the server:
```
VITE_SERVER_URL=http://localhost:5050
```

## Project structure

```
mern/
  client/       React + Vite frontend (port 8081)
  server/       Express backend (port 5050)
    db/         MongoDB connection
    routes/     REST routes: /record, /txndef, /transaction
mongo/
  restore.sh    Runs mongorestore on first container start
dump/
  employees/    mongodump of txndefs, transactions, records collections
```

## How it works

1. Create a **TxnDef** at `/txndefs/create` — give it a name, version, and a `@data-driven-forms` schema (JSON)
2. From the TxnDef list, click **Create Transaction** to fill out the generated form
3. Submitted transactions are stored with a reference back to their TxnDef schema

The `@data-driven-forms` schema format is documented at https://data-driven-forms.org/

## Styling

Form fields are rendered by `@data-driven-forms/mui-component-mapper` and styled via a custom MUI theme (`mern/client/src/theme.js`) based on the [VIC government design system](https://service.vic.gov.au). Primary colour is `#e3710a` (orange), body text is `#3c4a60` (dark blue-grey). To adjust the form appearance, edit `theme.js`.
