import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";

const serverURL = import.meta.env.VITE_SERVER_URL || "http://localhost:5050";

export default function PaymentComplete() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("loading");
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    if (!sessionId) { setStatus("error"); return; }
    fetch(`${serverURL}/payment/session-status?session_id=${sessionId}`)
      .then((r) => r.json())
      .then((data) => setStatus(data.status === "paid" ? "success" : "error"))
      .catch(() => setStatus("error"));
  }, [sessionId]);

  if (status === "loading") {
    return <p className="p-8 text-slate-600">Confirming payment…</p>;
  }

  if (status === "success") {
    return (
      <div className="p-8 max-w-lg">
        <h2 className="text-2xl font-bold mb-2" style={{ color: "#3c4a60" }}>Payment successful</h2>
        <p className="text-slate-600 mb-6">Your transaction has been submitted.</p>
        <Link to="/transactions" className="font-medium underline" style={{ color: "#e3710a" }}>
          View transactions →
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-lg">
      <h2 className="text-2xl font-bold mb-2 text-red-700">Payment unsuccessful</h2>
      <p className="text-slate-600 mb-6">Something went wrong or the payment was cancelled.</p>
      <Link to="/transactions" className="font-medium underline" style={{ color: "#e3710a" }}>
        Back to transactions →
      </Link>
    </div>
  );
}
