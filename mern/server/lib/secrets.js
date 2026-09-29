import crypto from "node:crypto";

/**
 * AES-256-GCM encryption for secrets we must be able to read back
 * (webhook signing secrets, outbound auth headers).
 *
 * The key comes from SECRETS_KEY (any string; it is hashed to 32 bytes).
 * Rotating SECRETS_KEY makes previously stored secrets unreadable.
 */

const DEV_FALLBACK = "dd-transactions-dev-only-secrets-key";

if (!process.env.SECRETS_KEY) {
  console.warn("WARNING: SECRETS_KEY is not set — using an insecure development key for stored secrets.");
}

const key = crypto
  .createHash("sha256")
  .update(process.env.SECRETS_KEY || DEV_FALLBACK)
  .digest();

export function encrypt(plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString("base64")).join(".");
}

export function decrypt(payload) {
  const [iv, tag, data] = payload.split(".").map((p) => Buffer.from(p, "base64"));
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
