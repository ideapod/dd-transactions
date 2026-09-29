import express from "express";
import cors from "cors";
import txndefs from "./routes/txndef.js";
import transactions from "./routes/transaction.js";
import payment from "./routes/payment.js";
import apikeys from "./routes/apikey.js";
import { ObjectId } from "mongodb";
import db from "./db/connection.js";
import { requireApiKey, canAccessTxnDef } from "./lib/apiKeys.js";
import { handleMcpRequest } from "./mcp/server.js";

const PORT = process.env.PORT || 5050;
const app = express();

app.use(cors());

// Stripe webhook needs raw body for signature verification — mount before express.json()
app.use("/payment/webhook", express.raw({ type: "application/json" }));

// All other routes get JSON body parsing
app.use(express.json());
app.use("/payment", payment);
app.use("/txndef", txndefs);
app.use("/transaction", transactions);
app.use("/apikey", apikeys);

/**
 * MCP server — lets an LLM author TxnDefs, read responses and configure
 * outbound connections. Requires a bearer API key; the tools offered depend
 * on the key's scopes. Stateless, so only POST is supported.
 */
app.post("/mcp", requireApiKey(), handleMcpRequest);
app.all("/mcp", (req, res) => {
  res.set("Allow", "POST").status(405).json({
    jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed" }, id: null,
  });
});

/**
 * Pull API — lets 3rd parties retrieve completed transactions
 * GET /api/transactions/:txndefid
 * Requires a bearer API key with the transactions:read scope.
 */
app.get("/api/transactions/:txndefid", requireApiKey("transactions:read"), async (req, res) => {
  if (!canAccessTxnDef(req.apiKey, req.params.txndefid)) {
    return res.status(404).json({ error: "TxnDef not found" });
  }
  try {
    const collection = db.collection("transactions");
    const results = await collection.find({
      schema_id: req.params.txndefid,
      status: { $in: ["complete", "free"] },
    }).toArray();
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving transactions");
  }
});

// start the Express server
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
