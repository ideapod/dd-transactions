import express from "express";
import { ObjectId } from "mongodb";
import db from "../db/connection.js";
import { SCOPES, createApiKey, publicKeyRecord } from "../lib/apiKeys.js";

// Admin routes for managing API keys — used by the admin UI.
// NOTE: like /txndef and /transaction these are not yet behind a user login.
const router = express.Router();

router.get("/scopes", (req, res) => {
  res.json(SCOPES);
});

router.get("/", async (req, res) => {
  const keys = await db.collection("api_keys").find({}).sort({ created: -1 }).toArray();
  res.json(keys.map(publicKeyRecord));
});

// Returns the plaintext key once — it cannot be retrieved again.
router.post("/", async (req, res) => {
  try {
    const { name, scopes, txndef_ids } = req.body;
    const { key, record } = await createApiKey({
      name,
      scopes,
      txndef_ids: txndef_ids?.length ? txndef_ids : null,
    });
    res.status(201).json({ key, record });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Revoking is a soft delete so last_used/created stay available for audit.
router.delete("/:id", async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: "invalid id" });
  const result = await db.collection("api_keys").updateOne(
    { _id: new ObjectId(req.params.id), revoked_at: null },
    { $set: { revoked_at: Date.now() } }
  );
  if (result.matchedCount === 0) return res.status(404).json({ error: "key not found or already revoked" });
  res.json({ revoked: true });
});

export default router;
