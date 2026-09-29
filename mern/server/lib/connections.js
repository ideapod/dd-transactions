import crypto from "node:crypto";
import dns from "node:dns/promises";
import net from "node:net";
import { ObjectId } from "mongodb";
import db from "../db/connection.js";
import { encrypt, decrypt } from "./secrets.js";

/**
 * Outbound connection settings for a TxnDef, stored in the `connections`
 * collection (one doc per TxnDef) so secrets never ride along with the
 * TxnDef document itself.
 *
 *   { txndef_id, signing_secret_enc, headers_enc, updated }
 *
 * The webhook URL stays on the TxnDef as `webhook_url`.
 */

const collection = () => db.collection("connections");

export function generateSigningSecret() {
  return "whsec_" + crypto.randomBytes(24).toString("base64url");
}

/** Safe-to-display view: never includes secret or header values. */
export async function getConnection(txndefId) {
  const txndef = await db.collection("txndefs").findOne(
    { _id: new ObjectId(txndefId) },
    { projection: { webhook_url: 1 } }
  );
  const conn = await collection().findOne({ txndef_id: String(txndefId) });
  const headers = conn?.headers_enc ? JSON.parse(decrypt(conn.headers_enc)) : {};
  return {
    txndef_id: String(txndefId),
    webhook_url: txndef?.webhook_url || null,
    has_signing_secret: Boolean(conn?.signing_secret_enc),
    header_names: Object.keys(headers),
    updated: conn?.updated || null,
  };
}

/**
 * Updates connection settings. Any field left undefined is unchanged.
 *   webhook_url: string | null
 *   headers: { name: value } — replaces all custom headers; a null value removes that header
 *   rotate_secret: true to generate a new signing secret
 *
 * Returns { connection, signing_secret } — signing_secret is only present
 * when a new one was generated (first configuration, or rotate_secret).
 */
export async function updateConnection(txndefId, { webhook_url, headers, rotate_secret } = {}) {
  const id = String(txndefId);

  if (webhook_url !== undefined) {
    if (webhook_url) await assertPublicUrl(webhook_url);
    await db.collection("txndefs").updateOne(
      { _id: new ObjectId(id) },
      { $set: { webhook_url: webhook_url || null } }
    );
  }

  const existing = await collection().findOne({ txndef_id: id });
  const $set = { txndef_id: id, updated: Date.now() };
  let signing_secret;

  if (rotate_secret || !existing?.signing_secret_enc) {
    signing_secret = generateSigningSecret();
    $set.signing_secret_enc = encrypt(signing_secret);
  }

  if (headers !== undefined) {
    const current = existing?.headers_enc ? JSON.parse(decrypt(existing.headers_enc)) : {};
    for (const [name, value] of Object.entries(headers || {})) {
      if (!/^[A-Za-z0-9-]+$/.test(name)) throw new Error(`invalid header name: ${name}`);
      if (value === null) delete current[name];
      else current[name] = String(value);
    }
    $set.headers_enc = encrypt(JSON.stringify(current));
  }

  await collection().updateOne({ txndef_id: id }, { $set }, { upsert: true });
  return { connection: await getConnection(id), signing_secret };
}

/** Decrypted settings for delivery — server-internal only. */
export async function getDeliveryConfig(txndefId) {
  const conn = await collection().findOne({ txndef_id: String(txndefId) });
  return {
    signingSecret: conn?.signing_secret_enc ? decrypt(conn.signing_secret_enc) : null,
    headers: conn?.headers_enc ? JSON.parse(decrypt(conn.headers_enc)) : {},
  };
}

export async function deleteConnection(txndefId) {
  await collection().deleteOne({ txndef_id: String(txndefId) });
}

// --- SSRF protection --------------------------------------------------------

/**
 * Rejects URLs that aren't http(s) or that resolve to private, loopback,
 * link-local or otherwise internal addresses. Set WEBHOOK_ALLOW_PRIVATE=true
 * to permit them for local development.
 */
export async function assertPublicUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error(`invalid URL: ${rawUrl}`);
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("webhook URL must use http or https");
  }
  if (process.env.WEBHOOK_ALLOW_PRIVATE === "true") return;

  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = net.isIP(host)
    ? [host]
    : (await dns.lookup(host, { all: true })).map((a) => a.address);

  for (const address of addresses) {
    if (isPrivateAddress(address)) {
      throw new Error(`webhook URL resolves to a private address (${address})`);
    }
  }
}

function isPrivateAddress(address) {
  if (net.isIPv6(address)) {
    const a = address.toLowerCase();
    if (a.startsWith("::ffff:")) return isPrivateAddress(a.slice(7));
    return a === "::" || a === "::1" || a.startsWith("fc") || a.startsWith("fd") || a.startsWith("fe80");
  }
  const [a, b] = address.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
    (a === 169 && b === 254) ||           // link-local, incl. cloud metadata
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224                              // multicast / reserved
  );
}
