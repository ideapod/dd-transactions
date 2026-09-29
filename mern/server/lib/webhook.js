import crypto from "node:crypto";
import { assertPublicUrl, getDeliveryConfig } from "./connections.js";

/**
 * Outbound webhook delivery.
 *
 * Every request is signed so the receiver can verify it came from us:
 *
 *   X-DDT-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<raw body>">
 *
 * using the TxnDef's signing secret (see lib/connections.js). Receivers should
 * recompute the HMAC, compare in constant time, and reject stale timestamps.
 * Any custom headers configured for the connection (e.g. an Authorization
 * header for the target system) are sent too.
 */

export function sign(secret, timestamp, body) {
  return crypto.createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

/**
 * Sends one event to the TxnDef's webhook_url. Never throws — returns
 * { delivered, status?, error? } so callers can report on it if they care.
 */
export async function deliver(txndef, event, payload) {
  if (!txndef?.webhook_url) return { delivered: false, error: "no webhook_url configured" };
  try {
    await assertPublicUrl(txndef.webhook_url);
    const { signingSecret, headers } = await getDeliveryConfig(txndef._id);

    const deliveryId = crypto.randomUUID();
    const body = JSON.stringify({
      event,
      delivery_id: deliveryId,
      txndef_id: txndef._id,
      txndef_name: txndef.name,
      ...payload,
    });
    const timestamp = Math.floor(Date.now() / 1000);

    const response = await fetch(txndef.webhook_url, {
      method: "POST",
      redirect: "manual", // don't let a redirect bounce us to an internal address
      signal: AbortSignal.timeout(10_000),
      headers: {
        ...headers,
        "Content-Type": "application/json",
        "X-DDT-Event": event,
        "X-DDT-Delivery": deliveryId,
        ...(signingSecret && { "X-DDT-Signature": `t=${timestamp},v1=${sign(signingSecret, timestamp, body)}` }),
      },
      body,
    });
    return { delivered: response.ok, status: response.status };
  } catch (err) {
    console.error("Webhook delivery failed:", txndef.webhook_url, err.message);
    return { delivered: false, error: err.message };
  }
}

/** Fires a `transaction.completed` event when a transaction completes. */
export async function fireWebhook(txndef, transaction) {
  if (!txndef?.webhook_url) return;
  await deliver(txndef, "transaction.completed", {
    transaction: {
      _id: transaction._id || transaction.insertedId,
      name: transaction.name,
      created: transaction.created,
      modified: transaction.modified,
      data: transaction.data,
      payment_amount: transaction.payment_amount,
      status: transaction.status,
    },
  });
}
