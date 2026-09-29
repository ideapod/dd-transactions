import crypto from "node:crypto";
import db from "../db/connection.js";

/**
 * API keys for 3rd-party access (pull API + MCP server).
 *
 * Keys look like `ddt_<43 base64url chars>`. Only a SHA-256 hash is stored;
 * the plaintext key is returned once at creation and never again.
 */

export const SCOPES = {
  "txndefs:read": "List and read transaction definitions",
  "txndefs:write": "Create and update transaction definitions",
  "transactions:read": "Read submitted transactions",
  "connections:manage": "Configure outbound webhooks and their credentials",
};

const KEY_PREFIX = "ddt_";

db.collection("api_keys")
  .createIndex({ key_hash: 1 }, { unique: true })
  .catch((err) => console.error("api_keys index creation failed:", err.message));

export function hashKey(key) {
  return crypto.createHash("sha256").update(key).digest("hex");
}

/**
 * Creates and stores a new key. Returns { key, record } — `key` is the only
 * time the plaintext is available.
 */
export async function createApiKey({ name, scopes, txndef_ids = null }) {
  if (!name || typeof name !== "string") throw new Error("name is required");
  if (!Array.isArray(scopes) || scopes.length === 0) throw new Error("at least one scope is required");
  const unknown = scopes.filter((s) => !SCOPES[s]);
  if (unknown.length) throw new Error(`unknown scope(s): ${unknown.join(", ")}`);
  if (txndef_ids !== null && (!Array.isArray(txndef_ids) || txndef_ids.length === 0)) {
    throw new Error("txndef_ids must be null (all) or a non-empty array");
  }

  const key = KEY_PREFIX + crypto.randomBytes(32).toString("base64url");
  const record = {
    name,
    prefix: key.slice(0, KEY_PREFIX.length + 8),
    key_hash: hashKey(key),
    scopes,
    txndef_ids: txndef_ids ? txndef_ids.map(String) : null,
    created: Date.now(),
    last_used: null,
    revoked_at: null,
  };
  const result = await db.collection("api_keys").insertOne(record);
  return { key, record: publicKeyRecord({ ...record, _id: result.insertedId }) };
}

/** Strips the hash before a key record leaves the server. */
export function publicKeyRecord({ key_hash, ...rest }) {
  return rest;
}

/** True if the key may see the given TxnDef (null txndef_ids = all TxnDefs). */
export function canAccessTxnDef(apiKey, txndefId) {
  return !apiKey.txndef_ids || apiKey.txndef_ids.includes(String(txndefId));
}

export async function authenticate(req) {
  const header = req.headers.authorization || "";
  const match = header.match(/^Bearer\s+(\S+)$/i);
  if (!match || !match[1].startsWith(KEY_PREFIX)) return null;

  const apiKey = await db.collection("api_keys").findOne({
    key_hash: hashKey(match[1]),
    revoked_at: null,
  });
  if (!apiKey) return null;

  // best effort — don't hold up the request for bookkeeping
  db.collection("api_keys")
    .updateOne({ _id: apiKey._id }, { $set: { last_used: Date.now() } })
    .catch((err) => console.error("api key last_used update failed:", err.message));

  return apiKey;
}

/**
 * Express middleware: requires a valid bearer key holding every listed scope.
 * Attaches the key record to req.apiKey.
 */
export function requireApiKey(...scopes) {
  return async (req, res, next) => {
    try {
      const apiKey = await authenticate(req);
      if (!apiKey) {
        res.set("WWW-Authenticate", 'Bearer realm="dd-transactions"');
        return res.status(401).json({ error: "Missing or invalid API key" });
      }
      const missing = scopes.filter((s) => !apiKey.scopes.includes(s));
      if (missing.length) {
        return res.status(403).json({ error: `API key lacks scope(s): ${missing.join(", ")}` });
      }
      req.apiKey = apiKey;
      next();
    } catch (err) {
      next(err);
    }
  };
}
