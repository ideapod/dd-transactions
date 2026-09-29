/**
 * Issues an API key from the command line (e.g. to bootstrap the first key).
 *
 *   docker compose exec server node scripts/create-api-key.js \
 *     --name "Claude Desktop" \
 *     --scopes txndefs:read,txndefs:write,transactions:read,connections:manage \
 *     [--txndefs <id>,<id>]
 *
 * The key is printed once and cannot be retrieved later.
 */
import { parseArgs } from "node:util";
import { SCOPES, createApiKey } from "../lib/apiKeys.js";

const { values } = parseArgs({
  options: {
    name: { type: "string" },
    scopes: { type: "string", default: Object.keys(SCOPES).join(",") },
    txndefs: { type: "string" },
  },
});

try {
  const { key, record } = await createApiKey({
    name: values.name,
    scopes: values.scopes.split(",").map((s) => s.trim()),
    txndef_ids: values.txndefs ? values.txndefs.split(",").map((s) => s.trim()) : null,
  });
  console.log(`\nCreated API key "${record.name}" (${record.prefix}…)`);
  console.log(`Scopes:   ${record.scopes.join(", ")}`);
  console.log(`TxnDefs:  ${record.txndef_ids ? record.txndef_ids.join(", ") : "all"}`);
  console.log(`\n  ${key}\n`);
  console.log("Store it now — it will not be shown again.");
  process.exit(0);
} catch (err) {
  console.error(`Error: ${err.message}`);
  console.error(`Usage: node scripts/create-api-key.js --name <name> [--scopes ${Object.keys(SCOPES).join(",")}] [--txndefs id,id]`);
  process.exit(1);
}
