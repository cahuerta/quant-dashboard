import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL;

export default function Global() {
  const [market, setMarket] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API}/dashboard/market-context`);
        const json = await res.json();
        setMarket(json);
      } catch (e) {
        console.error("Global load error", e);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return <div className="global-loading">Loading summary...</div>;
  }

  return (
    <div className="global-container">
      <div className="global-header">
        <h1>Quant Global Overview</h1>
      </div>

      <div className="global-summary">

        <SummaryCard
          label="Market Mode"
          value={market?.market_mode ?? "—"}
        />

        <SummaryCard
          label="Confidence"
          value={
            market?.confidence != null
              ? `${(market.confidence * 100).toFixed(1)}%`
              : "—"
          }
        />

        <SummaryCard
          label="Reason"
          value={market?.reason ?? "—"}
        />

        <SummaryCard
          label="Last Update"
          value={formatDate(market?.timestamp)}
        />

      </div>
    </div>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="summary-card">
      <div className="summary-label">{label}</div>
      <div className="summary-value">{value}</div>
    </div>
  );
}

function formatDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return "—";
  }
}
