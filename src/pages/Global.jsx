import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL;

export default function Global() {
  const [market, setMarket] = useState(null);
  const [pipeline, setPipeline] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const m = await fetch(`${API}/dashboard/market-context`);
        const p = await fetch(`${API}/internal/pipeline/last`);

        const marketJson = await m.json();
        const pipelineJson = await p.json();

        setMarket(marketJson);
        setPipeline(pipelineJson);
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

  const lastRun =
    pipeline?.timestamp ??
    pipeline?.generated_at ??
    "—";

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
          label="Last Pipeline Run"
          value={formatDate(lastRun)}
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
  if (!d || d === "—") return "—";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return "—";
  }
}
