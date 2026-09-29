import { useEffect, useState } from "react";

const serverURL = import.meta.env.VITE_SERVER_URL || "http://localhost:5050";

const buttonClass =
  "inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-slate-100 h-9 rounded-md px-3";
const cellClass = "p-4 align-middle";
const headClass = "h-12 px-4 text-left align-middle font-medium text-muted-foreground";

const formatDate = (ts) => (ts ? new Date(ts).toLocaleString() : "—");

export default function ApiKeys() {
  const [keys, setKeys] = useState([]);
  const [scopes, setScopes] = useState({});
  const [txndefs, setTxnDefs] = useState([]);
  const [form, setForm] = useState({ name: "", scopes: [], txndef_ids: [] });
  const [newKey, setNewKey] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  async function loadKeys() {
    const response = await fetch(`${serverURL}/apikey`);
    if (response.ok) setKeys(await response.json());
  }

  useEffect(() => {
    loadKeys();
    fetch(`${serverURL}/apikey/scopes`).then((r) => r.json()).then(setScopes);
    fetch(`${serverURL}/txndef`).then((r) => r.json()).then(setTxnDefs);
  }, []);

  function toggle(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((v) => v !== value)
        : [...prev[field], value],
    }));
  }

  async function onCreate(e) {
    e.preventDefault();
    setError(null);
    const response = await fetch(`${serverURL}/apikey`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const body = await response.json();
    if (!response.ok) return setError(body.error);
    setNewKey(body);
    setCopied(false);
    setForm({ name: "", scopes: [], txndef_ids: [] });
    loadKeys();
  }

  async function onRevoke(key) {
    if (!window.confirm(`Revoke "${key.name}"? Anything using it will stop working immediately.`)) return;
    await fetch(`${serverURL}/apikey/${key._id}`, { method: "DELETE" });
    loadKeys();
  }

  async function copyKey() {
    await navigator.clipboard.writeText(newKey.key);
    setCopied(true);
  }

  const txndefName = (id) => txndefs.find((t) => t._id === id)?.name || id;

  return (
    <>
      <h3 className="text-lg font-semibold p-4">API Keys</h3>
      <p className="text-sm text-slate-600 px-4 mb-4 max-w-3xl">
        Keys give third-party systems and LLM clients access to the pull API
        (<code>/api/transactions/:id</code>) and the MCP server (<code>/mcp</code>).
        Send as <code>Authorization: Bearer &lt;key&gt;</code>.
      </p>

      {newKey && (
        <div className="border border-orange-300 bg-orange-50 rounded-lg p-4 mb-6">
          <p className="text-sm font-semibold text-slate-900 mb-2">
            Key created for &ldquo;{newKey.record.name}&rdquo;. Copy it now. You won&rsquo;t be able to see it again.
          </p>
          <div className="flex gap-2 items-center">
            <code className="flex-1 bg-white border rounded px-3 py-2 text-sm break-all">{newKey.key}</code>
            <button type="button" className={buttonClass} onClick={copyKey}>
              {copied ? "Copied" : "Copy"}
            </button>
            <button type="button" className={buttonClass} onClick={() => setNewKey(null)}>
              Done
            </button>
          </div>
        </div>
      )}

      <form onSubmit={onCreate} className="border rounded-lg p-4 mb-6 flex flex-col gap-4">
        <h4 className="text-base font-semibold">New key</h4>
        <div>
          <label htmlFor="key-name" className="block text-sm font-medium text-slate-900">Name</label>
          <input
            id="key-name"
            className="mt-2 block w-full max-w-md rounded-md border-0 py-1.5 pl-2 ring-1 ring-inset ring-slate-300 text-sm"
            placeholder="e.g. Claude Desktop, CRM integration"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <fieldset>
          <legend className="block text-sm font-medium text-slate-900 mb-2">Scopes</legend>
          {Object.entries(scopes).map(([scope, description]) => (
            <label key={scope} className="flex items-center gap-2 text-sm mb-1">
              <input type="checkbox" checked={form.scopes.includes(scope)} onChange={() => toggle("scopes", scope)} />
              <code>{scope}</code>
              <span className="text-slate-500">{description}</span>
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend className="block text-sm font-medium text-slate-900 mb-2">
            Limit to transaction definitions <span className="text-slate-400 font-normal">(none selected = all)</span>
          </legend>
          {txndefs.map((t) => (
            <label key={t._id} className="flex items-center gap-2 text-sm mb-1">
              <input type="checkbox" checked={form.txndef_ids.includes(t._id)} onChange={() => toggle("txndef_ids", t._id)} />
              {t.name}
            </label>
          ))}
        </fieldset>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <div>
          <button type="submit" className={buttonClass} disabled={!form.name || form.scopes.length === 0}>
            Create key
          </button>
        </div>
      </form>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className={headClass}>Name</th>
              <th className={headClass}>Key</th>
              <th className={headClass}>Scopes</th>
              <th className={headClass}>TxnDefs</th>
              <th className={headClass}>Last used</th>
              <th className={headClass}></th>
            </tr>
          </thead>
          <tbody>
            {keys.map((key) => (
              <tr key={key._id} className={`border-b ${key.revoked_at ? "text-slate-400" : ""}`}>
                <td className={cellClass}>{key.name}</td>
                <td className={cellClass}><code>{key.prefix}…</code></td>
                <td className={cellClass}>{key.scopes.join(", ")}</td>
                <td className={cellClass}>{key.txndef_ids ? key.txndef_ids.map(txndefName).join(", ") : "All"}</td>
                <td className={cellClass}>{formatDate(key.last_used)}</td>
                <td className={cellClass}>
                  {key.revoked_at ? (
                    `Revoked ${formatDate(key.revoked_at)}`
                  ) : (
                    <button type="button" className={buttonClass} onClick={() => onRevoke(key)}>Revoke</button>
                  )}
                </td>
              </tr>
            ))}
            {keys.length === 0 && (
              <tr><td className={cellClass} colSpan={6}>No keys yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
