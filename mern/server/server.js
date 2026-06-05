import express from "express";
import cors from "cors";
import txndefs from "./routes/txndef.js";
import transactions from "./routes/transaction.js";
import payment from "./routes/payment.js";
import { ObjectId } from "mongodb";
import db from "./db/connection.js";

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

/**
 * Pull API — open endpoint for 3rd parties to retrieve completed transactions
 * GET /api/transactions/:txndefid
 */
app.get("/api/transactions/:txndefid", async (req, res) => {
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
