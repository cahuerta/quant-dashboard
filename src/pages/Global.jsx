import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL;

export default function Global() {
  const [market, setMarket] = useState(null);
  const [capital, setCapital] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const m = await fetch(`${API}/dashboard/market-context`);
        const c = await fetch(`${API}/trading/state`);

        const marketJson = await m.json();
        const capitalJson = await c.json();

        setMarket(marketJson);
        setCapital(capitalJson);
      } catch (e) {
        console.error("Global load error", e);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return (
      <div className="global-loading">
        Calculando estado global...
      </div>
    );
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
          value={market?.confidence ?? "—"}
        />

        <SummaryCard
          label="Portfolio Value"
          value={
            capital?.total_value
              ? `$${capital.total_value}`
              : "—"
          }
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
