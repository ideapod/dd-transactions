/**
 * Fires a POST to the TxnDef's webhook_url when a transaction completes.
 * Silently swallows errors so a bad webhook URL never breaks the main flow.
 */
export async function fireWebhook(txndef, transaction) {
  if (!txndef?.webhook_url) return;
  try {
    await fetch(txndef.webhook_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "transaction.completed",
        txndef_id: txndef._id,
        txndef_name: txndef.name,
        transaction: {
          _id: transaction._id || transaction.insertedId,
          name: transaction.name,
          created: transaction.created,
          modified: transaction.modified,
          data: transaction.data,
          payment_amount: transaction.payment_amount,
          status: transaction.status,
        },
      }),
    });
  } catch (err) {
    console.error("Webhook delivery failed:", txndef.webhook_url, err.message);
  }
}
