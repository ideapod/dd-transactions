import express from "express";
import cors from "cors";
import txndefs from "./routes/txndef.js";
import transactions from "./routes/transaction.js";

const PORT = process.env.PORT || 5050;
const app = express();

app.use(cors());
app.use(express.json());
app.use("/txndef", txndefs);
app.use("/transaction", transactions);

// start the Express server
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});