import { useEffect, useState } from "react";

const serverURL = import.meta.env.VITE_SERVER_URL || "http://localhost:5050";

const buttonClass =
  "inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-slate-100 h-9 rounded-md px-3";
const inputClass = "block rounded-md border-0 py-1.5 pl-2 ring-1 ring-inset ring-slate-300 text-sm";

/**
 * Webhook signing secret and custom outbound headers for a saved TxnDef.
 * Secret and header values are write-only; the server returns the signing
 * secret only at the moment it is generated.
 */
// eslint-disable-next-line react/prop-types
export default function ConnectionPanel({ txndefId }) {
  const [connection, setConnection] = useState(null);
  const [secret, setSecret] = useState(null);
  const [header, setHeader] = useState({ name: "", value: "" });
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetch(`${serverURL}/txndef/${txndefId}/connection`)
      .then((response) => (response.ok ? response.json() : null))
      .then(setConnection);
  }, [txndefId]);

  async function update(body) {
    setMessage(null);
    const response = await fetch(`${serverURL}/txndef/${txndefId}/connection`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) return setMessage(result.error);
    setConnection(result.connection);
    if (result.signing_secret) setSecret(result.signing_secret);
  }

  async function sendTest() {
    setMessage("Sending…");
    const response = await fetch(`${serverURL}/txndef/${txndefId}/connection/test`, { method: "POST" });
    const result = await response.json();
    setMessage(result.delivered ? `Delivered (HTTP ${result.status})` : `Failed: ${result.error || `HTTP ${result.status}`}`);
  }

  function addHeader() {
    update({ headers: { [header.name]: header.value } });
    setHeader({ name: "", value: "" });
  }

  if (!connection) return null;

  return (
    <div className="border rounded-lg p-4 flex flex-col gap-4">
      <div>
        <h4 className="text-base font-semibold">Outbound connection</h4>
        <p className="text-sm text-slate-500">
          Each POST to the webhook URL is signed with an{" "}
          <code>X-DDT-Signature: t=&lt;timestamp&gt;,v1=&lt;HMAC-SHA256&gt;</code> header so the receiver can verify it.
        </p>
      </div>

      <div>
        <p className="text-sm font-medium text-slate-900 mb-2">Signing secret</p>
        {secret ? (
          <div className="border border-orange-300 bg-orange-50 rounded p-3 text-sm">
            <p className="mb-2">Copy this into the receiving system now. You won&rsquo;t be able to see it again.</p>
            <code className="block bg-white border rounded px-3 py-2 break-all">{secret}</code>
          </div>
        ) : (
          <p className="text-sm text-slate-600 mb-2">
            {connection.has_signing_secret ? "A signing secret is set." : "No signing secret yet. Deliveries are unsigned."}
          </p>
        )}
        <button
          type="button"
          className={`${buttonClass} mt-2`}
          onClick={() => {
            if (!connection.has_signing_secret || window.confirm("Rotate the secret? The receiving system must be updated with the new one.")) {
              update({ rotate_secret: true });
            }
          }}
        >
          {connection.has_signing_secret ? "Rotate secret" : "Generate secret"}
        </button>
      </div>

      <div>
        <p className="text-sm font-medium text-slate-900 mb-2">
          Custom headers <span className="text-slate-400 font-normal">(e.g. Authorization for the target system; values are stored encrypted)</span>
        </p>
        {connection.header_names.map((name) => (
          <div key={name} className="flex items-center gap-2 text-sm mb-1">
            <code>{name}: ••••••</code>
            <button type="button" className="text-red-700 hover:underline" onClick={() => update({ headers: { [name]: null } })}>
              remove
            </button>
          </div>
        ))}
        {/* this panel sits inside the TxnDef <form>; stop Enter from submitting it */}
        <div className="flex gap-2 mt-2" onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}>
          <input className={inputClass} placeholder="Header name" value={header.name} onChange={(e) => setHeader({ ...header, name: e.target.value })} />
          <input className={`${inputClass} flex-1 max-w-md`} type="password" placeholder="Value" value={header.value} onChange={(e) => setHeader({ ...header, value: e.target.value })} />
          <button type="button" className={buttonClass} disabled={!header.name || !header.value} onClick={addHeader}>
            Add
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button type="button" className={buttonClass} disabled={!connection.webhook_url} onClick={sendTest}>
          Send test event
        </button>
        {!connection.webhook_url && <span className="text-sm text-slate-500">Save a webhook URL first.</span>}
        {message && <span className="text-sm text-slate-700">{message}</span>}
      </div>
    </div>
  );
}
