import fs from "node:fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { ObjectId } from "mongodb";
import { z } from "zod";
import db from "../db/connection.js";
import { canAccessTxnDef } from "../lib/apiKeys.js";
import { validateSchema } from "../lib/schemaValidator.js";
import { getConnection, updateConnection, assertPublicUrl } from "../lib/connections.js";
import { deliver } from "../lib/webhook.js";

/**
 * MCP server exposed at /mcp over Streamable HTTP (stateless — a fresh
 * server per request). Authenticated with the same bearer API keys as the
 * pull API; tools are only registered if the key holds the scope they need,
 * and every TxnDef lookup honours the key's txndef_ids restriction.
 */

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:8081";
const schemaGuide = fs.readFileSync(new URL("./schema-guide.md", import.meta.url), "utf8");

class ToolError extends Error {}

const json = (value) => ({ content: [{ type: "text", text: JSON.stringify(value, null, 2) }] });

// Wraps a handler so ToolErrors come back to the model as tool errors it can act on.
const tool = (fn) => async (args) => {
  try {
    return await fn(args);
  } catch (err) {
    if (!(err instanceof ToolError)) console.error("MCP tool error:", err);
    return { isError: true, content: [{ type: "text", text: err.message }] };
  }
};

function oid(id, what = "id") {
  if (!ObjectId.isValid(id)) throw new ToolError(`${what} "${id}" is not a valid ObjectId`);
  return new ObjectId(id);
}

function withFormUrl(txndef) {
  return { ...txndef, form_url: `${CLIENT_URL}/transactions/create/${txndef._id}` };
}

function buildServer(apiKey) {
  const server = new McpServer({ name: "dd-transactions", version: "1.0.0" });
  const has = (scope) => apiKey.scopes.includes(scope);

  async function loadTxnDef(id) {
    if (!canAccessTxnDef(apiKey, id)) throw new ToolError(`TxnDef ${id} not found`);
    const txndef = await db.collection("txndefs").findOne({ _id: oid(id, "txndef_id") });
    if (!txndef) throw new ToolError(`TxnDef ${id} not found`);
    return txndef;
  }

  function assertValid(schema) {
    const { valid, errors } = validateSchema(schema);
    if (!valid) throw new ToolError(`Schema is invalid:\n- ${errors.join("\n- ")}\n\nCall get_schema_guide for the rules.`);
  }

  server.registerTool(
    "get_schema_guide",
    {
      title: "Schema authoring guide",
      description: "How to write a transaction definition schema: components, validation, wizards, payment steps and house style. Read this before creating or updating a TxnDef.",
      annotations: { readOnlyHint: true },
    },
    tool(async () => ({ content: [{ type: "text", text: schemaGuide }] }))
  );

  if (has("txndefs:read")) {
    server.registerTool(
      "list_txndefs",
      {
        title: "List transaction definitions",
        description: "Lists the transaction definitions (forms) this key can access, with each form's public URL.",
        annotations: { readOnlyHint: true },
      },
      tool(async () => {
        const query = apiKey.txndef_ids ? { _id: { $in: apiKey.txndef_ids.map((id) => new ObjectId(id)) } } : {};
        const txndefs = await db.collection("txndefs")
          .find(query, { projection: { name: 1, version: 1, webhook_url: 1 } })
          .toArray();
        return json(txndefs.map(withFormUrl));
      })
    );

    server.registerTool(
      "get_txndef",
      {
        title: "Get transaction definition",
        description: "Returns one transaction definition including its full schema.",
        inputSchema: { txndef_id: z.string() },
        annotations: { readOnlyHint: true },
      },
      tool(async ({ txndef_id }) => json(withFormUrl(await loadTxnDef(txndef_id))))
    );
  }

  if (has("txndefs:write")) {
    server.registerTool(
      "create_txndef",
      {
        title: "Create transaction definition",
        description: "Creates a new form from a @data-driven-forms schema. The schema is validated first; call get_schema_guide before authoring. Returns the new TxnDef with its public form_url.",
        inputSchema: {
          name: z.string().min(1),
          version: z.string().default("1.0"),
          schema: z.object({ fields: z.array(z.any()) }).passthrough(),
        },
      },
      tool(async ({ name, version, schema }) => {
        if (apiKey.txndef_ids) {
          throw new ToolError("This API key is restricted to specific TxnDefs and cannot create new ones.");
        }
        assertValid(schema);
        const doc = { name, version, schema, webhook_url: null };
        const result = await db.collection("txndefs").insertOne(doc);
        return json(withFormUrl({ ...doc, _id: result.insertedId }));
      })
    );

    server.registerTool(
      "update_txndef",
      {
        title: "Update transaction definition",
        description: "Updates a form's name, version and/or schema. Omitted fields are unchanged. A new schema replaces the old one entirely and is validated first. Existing transactions keep their data.",
        inputSchema: {
          txndef_id: z.string(),
          name: z.string().min(1).optional(),
          version: z.string().optional(),
          schema: z.object({ fields: z.array(z.any()) }).passthrough().optional(),
        },
      },
      tool(async ({ txndef_id, name, version, schema }) => {
        await loadTxnDef(txndef_id);
        if (schema) assertValid(schema);
        const $set = Object.fromEntries(
          Object.entries({ name, version, schema }).filter(([, v]) => v !== undefined)
        );
        if (Object.keys($set).length === 0) throw new ToolError("Nothing to update.");
        await db.collection("txndefs").updateOne({ _id: oid(txndef_id) }, { $set });
        return json(withFormUrl(await loadTxnDef(txndef_id)));
      })
    );
  }

  if (has("transactions:read")) {
    server.registerTool(
      "list_transactions",
      {
        title: "List transactions",
        description: "Lists submitted transactions (form responses) for a TxnDef, newest first. `data` holds the answers keyed by field name. By default only finished transactions (status free or complete) are returned.",
        inputSchema: {
          txndef_id: z.string(),
          status: z.array(z.enum(["free", "pending", "complete"])).optional()
            .describe("Statuses to include. Defaults to [\"free\", \"complete\"]."),
          since: z.string().optional().describe("ISO 8601 date/time; only transactions created at or after this."),
          limit: z.number().int().min(1).max(500).default(50),
        },
        annotations: { readOnlyHint: true },
      },
      tool(async ({ txndef_id, status = ["free", "complete"], since, limit }) => {
        await loadTxnDef(txndef_id);
        const query = { schema_id: txndef_id, status: { $in: status } };
        if (since) {
          const ts = Date.parse(since);
          if (Number.isNaN(ts)) throw new ToolError(`"since" is not a valid date: ${since}`);
          query.created = { $gte: ts };
        }
        const transactions = await db.collection("transactions")
          .find(query).sort({ created: -1 }).limit(limit).toArray();
        const total = await db.collection("transactions").countDocuments(query);
        return json({ total, returned: transactions.length, transactions });
      })
    );

    server.registerTool(
      "get_transaction",
      {
        title: "Get transaction",
        description: "Returns one submitted transaction by id.",
        inputSchema: { transaction_id: z.string() },
        annotations: { readOnlyHint: true },
      },
      tool(async ({ transaction_id }) => {
        const txn = await db.collection("transactions").findOne({ _id: oid(transaction_id, "transaction_id") });
        if (!txn || !canAccessTxnDef(apiKey, txn.schema_id)) throw new ToolError(`Transaction ${transaction_id} not found`);
        return json(txn);
      })
    );
  }

  if (has("connections:manage")) {
    server.registerTool(
      "get_connection",
      {
        title: "Get outbound connection",
        description: "Shows a TxnDef's outbound webhook settings: URL, whether a signing secret exists, and custom header names (values are never returned).",
        inputSchema: { txndef_id: z.string() },
        annotations: { readOnlyHint: true },
      },
      tool(async ({ txndef_id }) => {
        await loadTxnDef(txndef_id);
        return json(await getConnection(txndef_id));
      })
    );

    server.registerTool(
      "configure_connection",
      {
        title: "Configure outbound connection",
        description: [
          "Configures where a TxnDef POSTs `transaction.completed` events so a third-party system receives each response.",
          "Every delivery is signed: header `X-DDT-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256 of \"<t>.<raw body>\">`.",
          "A signing secret is generated the first time (or when rotate_secret is true) and returned ONCE in `signing_secret`; give it to the receiving system.",
          "`headers` sets custom request headers such as an Authorization header for the target API. They are stored encrypted and never shown again; set a header to null to remove it.",
          "Private, loopback and internal addresses are rejected.",
        ].join(" "),
        inputSchema: {
          txndef_id: z.string(),
          webhook_url: z.string().url().nullable().optional().describe("null disables delivery"),
          headers: z.record(z.string().nullable()).optional(),
          rotate_secret: z.boolean().optional(),
        },
        annotations: { destructiveHint: false },
      },
      tool(async ({ txndef_id, webhook_url, headers, rotate_secret }) => {
        await loadTxnDef(txndef_id);
        if (webhook_url) {
          try { await assertPublicUrl(webhook_url); } catch (err) { throw new ToolError(err.message); }
        }
        try {
          return json(await updateConnection(txndef_id, { webhook_url, headers, rotate_secret }));
        } catch (err) {
          throw new ToolError(err.message);
        }
      })
    );

    server.registerTool(
      "test_connection",
      {
        title: "Send test webhook",
        description: "Sends a signed `webhook.test` event to the TxnDef's webhook URL and reports the HTTP status the receiver returned.",
        inputSchema: { txndef_id: z.string() },
      },
      tool(async ({ txndef_id }) => {
        const txndef = await loadTxnDef(txndef_id);
        return json(await deliver(txndef, "webhook.test", { test: true, sent_at: new Date().toISOString() }));
      })
    );
  }

  return server;
}

/** Express handler for POST /mcp. Expects req.apiKey (see requireApiKey). */
export async function handleMcpRequest(req, res) {
  const server = buildServer(req.apiKey);
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless
    enableJsonResponse: true,
  });
  res.on("close", () => {
    transport.close();
    server.close();
  });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error("MCP request failed:", err);
    if (!res.headersSent) {
      res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: null });
    }
  }
}
