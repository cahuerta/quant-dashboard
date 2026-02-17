import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL;

export default function Global() {
  const [market, setMarket] = useState(null);
  const [perf, setPerf] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setError(null);

        const [marketRes, perfRes] = await Promise.all([
          fetch(`${API}/dashboard/market-context`, {
            cache: "no-store",
            headers: { Accept: "application/json" },
          }),
          fetch(`${API}/dashboard/performance`, {
            cache: "no-store",
            headers: { Accept: "application/json" },
          }),
        ]);

        if (!marketRes.ok) {
          throw new Error(`Market HTTP ${marketRes.status}`);
        }

        if (!perfRes.ok) {
          throw new Error(`Performance HTTP ${perfRes.status}`);
        }

        const marketJson = await marketRes.json();
        const perfJson = await perfRes.json();

        setMarket(marketJson);
        setPerf(perfJson);
      } catch (e) {
        console.error("Global load error:", e);
        setError(e.message || "Error");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) return <div className="global-loading">Loading...</div>;
  if (error) return <div className="global-error">{error}</div>;

  return (
    <div className="global-container">
      <div className="global-header">
        <h1>Global</h1>
      </div>

      <div className="global-summary">

        {/* MARKET */}
        <SummaryCard
          label="Market Mode"
          value={market?.market_mode?.toUpperCase() ?? "—"}
        />

        <SummaryCard
          label="Regime Strength"
          value={
            market?.confidence != null
              ? `${Math.round(market.confidence * 100)}%`
              : "—"
          }
        />

        {/* PERFORMANCE */}
        <SummaryCard
          label="Equity"
          value={
            perf?.equity != null
              ? `$${Number(perf.equity).toLocaleString()}`
              : "—"
          }
        />

        <SummaryCard
          label="Total Return (%)"
          value={
            perf?.total_return_pct != null
              ? `${perf.total_return_pct}%`
              : "—"
          }
        />

        <SummaryCard
          label="High Water Mark"
          value={
            perf?.high_water_mark != null
              ? `$${Number(perf.high_water_mark).toLocaleString()}`
              : "—"
          }
        />

        <SummaryCard
          label="Drawdown (%)"
          value={
            perf?.drawdown_pct != null
              ? `${perf.drawdown_pct}%`
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
