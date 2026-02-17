import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL;

export default function Global() {
  const [market, setMarket] = useState(null);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const m = await fetch(`${API}/dashboard/market-context`);
        const pos = await fetch(`/api/internal-proxy`);

        const marketJson = await m.json();
        const positionsJson = await pos.json();

        setMarket(marketJson);
        setPositions(Array.isArray(positionsJson) ? positionsJson : []);
      } catch (e) {
        console.error("Global load error", e);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return <div className="global-loading">Loading global state...</div>;
  }

  const portfolioValue = positions.reduce(
    (acc, p) => acc + (p.market_value || 0),
    0
  );

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
          label="Positions"
          value={positions.length}
        />

        <SummaryCard
          label="Portfolio Value"
          value={
            portfolioValue
              ? `$${portfolioValue.toLocaleString()}`
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
