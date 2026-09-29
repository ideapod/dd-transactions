import express from "express";

// This will help us connect to the database
import db from "../db/connection.js";

// This help convert the id from string to ObjectId for the _id.
import { ObjectId } from "mongodb";
import { getConnection, updateConnection, deleteConnection, assertPublicUrl } from "../lib/connections.js";
import { deliver } from "../lib/webhook.js";

// router is an instance of the express router.
// We use it to define our routes.
// The router will be added as a middleware and will take control of requests starting with path /record.
const router = express.Router();

// This section will help you get a list of all the txn defintions.
router.get("/", async (req, res) => {
  let collection = await db.collection("txndefs");
  let results = await collection.find({}).toArray();
  console.log('got list of ' + results.length + ' records');
  res.send(results).status(200);
});

// This section will help you get a single record by id
router.get("/:id", async (req, res) => {
  console.log('getting txndef with id: ' + req.params.id);
  let collection = await db.collection("txndefs");
  let query = { _id: new ObjectId(req.params.id) };
  let result = await collection.findOne(query);

  if (!result) res.send("Not found").status(404);
  else res.send(result).status(200);
});

// This section will help you create a new record.
router.post("/", async (req, res) => {
  try {
    if (req.body.webhook_url) await assertPublicUrl(req.body.webhook_url);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
  try {
    let newDocument = {
      name: req.body.name,
      version: req.body.version,
      schema: req.body.schema,
      webhook_url: req.body.webhook_url || null,
    };
    console.log ('posting new transaction definition' + newDocument.name);
    let collection = await db.collection("txndefs");
    let result = await collection.insertOne(newDocument);
    res.send(result).status(204);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error adding record");
  }
});

// This section will help you update a record by id.
router.patch("/:id", async (req, res) => {
  try {
    if (req.body.webhook_url) await assertPublicUrl(req.body.webhook_url);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
  try {
    const query = { _id: new ObjectId(req.params.id) };
    const updates = {
      $set: {
        name: req.body.name,
        version: req.body.version,
        schema: req.body.schema,
        webhook_url: req.body.webhook_url || null,
      },
    };

    let collection = await db.collection("txndefs");
    let result = await collection.updateOne(query, updates);
    res.send(result).status(200);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating record");
  }
});

// This section will help you delete a record
router.delete("/:id", async (req, res) => {
  try {
    const query = { _id: new ObjectId(req.params.id) };

    const collection = db.collection("txndefs");
    let result = await collection.deleteOne(query);
    await deleteConnection(req.params.id);

    res.send(result).status(200);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error deleting record");
  }
});

// Outbound connection settings (webhook signing secret + custom headers).
// Secret and header values are write-only; the signing secret is returned
// only when it is generated.
router.get("/:id/connection", async (req, res) => {
  try {
    res.json(await getConnection(req.params.id));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error retrieving connection" });
  }
});

router.put("/:id/connection", async (req, res) => {
  try {
    const { webhook_url, headers, rotate_secret } = req.body;
    res.json(await updateConnection(req.params.id, { webhook_url, headers, rotate_secret }));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/:id/connection/test", async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: "invalid id" });
  const txndef = await db.collection("txndefs").findOne({ _id: new ObjectId(req.params.id) });
  if (!txndef) return res.status(404).json({ error: "TxnDef not found" });
  res.json(await deliver(txndef, "webhook.test", { test: true, sent_at: new Date().toISOString() }));
});

export default router;