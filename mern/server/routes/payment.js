import express from "express";
import Stripe from "stripe";
import { ObjectId } from "mongodb";
import db from "../db/connection.js";
import { fireWebhook } from "../lib/webhook.js";

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:8081";

/**
 * POST /payment/create-checkout-session
 * Body: { txnDefId, formData }
 *
 * Finds the payment step in the TxnDef schema, creates a pending transaction,
 * then creates a Stripe Checkout session and returns the redirect URL.
 */
router.post("/create-checkout-session", async (req, res) => {
  try {
    const { txnDefId, formData } = req.body;

    const txndef = await db.collection("txndefs").findOne({ _id: new ObjectId(txnDefId) });
    if (!txndef) return res.status(404).send("TxnDef not found");

    // find the payment step in the schema
    const wizardField = txndef.schema?.fields?.find((f) => f.component === "wizard");
    const paymentStep = wizardField?.fields?.find((s) => s.type === "payment");
    if (!paymentStep) return res.status(400).send("No payment step found in schema");

    const { amount_cents, currency = "aud", description } = paymentStep;

    // save a pending transaction to hold the form data
    const txnCollection = db.collection("transactions");
    const pending = await txnCollection.insertOne({
      schema_id: txnDefId,
      name: txndef.name,
      created: Date.now(),
      modified: Date.now(),
      data: formData,
      status: "pending",
      stripe_session_id: null,
      payment_amount: amount_cents,
    });

    const transactionId = pending.insertedId.toString();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency,
          product_data: { name: description || txndef.name },
          unit_amount: amount_cents,
        },
        quantity: 1,
      }],
      mode: "payment",
      success_url: `${CLIENT_URL}/transactions/complete?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${CLIENT_URL}/transactions`,
      metadata: { transaction_id: transactionId },
    });

    // store the session id on the pending transaction
    await txnCollection.updateOne(
      { _id: pending.insertedId },
      { $set: { stripe_session_id: session.id } }
    );

    res.json({ url: session.url });
  } catch (err) {
    console.error("create-checkout-session error:", err);
    res.status(500).send("Error creating checkout session");
  }
});

/**
 * GET /payment/session-status?session_id=xxx
 * Used by PaymentComplete page to confirm payment status.
 */
router.get("/session-status", async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(req.query.session_id);
    const transaction = await db.collection("transactions").findOne({
      stripe_session_id: req.query.session_id,
    });
    res.json({ status: session.payment_status, transaction });
  } catch (err) {
    console.error("session-status error:", err);
    res.status(500).send("Error retrieving session status");
  }
});

/**
 * POST /payment/webhook
 * Stripe calls this when a checkout session completes.
 * Requires the raw request body — see server.js for the raw body parser.
 */
router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const transactionId = session.metadata?.transaction_id;

    if (transactionId) {
      const txnCollection = db.collection("transactions");
      await txnCollection.updateOne(
        { _id: new ObjectId(transactionId) },
        { $set: { status: "complete", modified: Date.now() } }
      );

      // fire webhook to TxnDef's configured URL if set
      const transaction = await txnCollection.findOne({ _id: new ObjectId(transactionId) });
      const txndef = await db.collection("txndefs").findOne({ _id: new ObjectId(transaction.schema_id) });
      await fireWebhook(txndef, transaction);

      console.log(`Transaction ${transactionId} marked complete`);
    }
  }

  res.json({ received: true });
});

export default router;
