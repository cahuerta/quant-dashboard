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

        const marketPromise = fetch(`${API}/dashboard/market-context`, {
          cache: "no-store",
          headers: { Accept: "application/json" },
        });

        const perfPromise = fetch(`${API}/dashboard/performance`, {
          cache: "no-store",
          headers: { Accept: "application/json" },
        });

        const marketRes = await marketPromise;

        // 🔥 MARKET ES CRÍTICO
        if (!marketRes.ok) {
          throw new Error(`Market HTTP ${marketRes.status}`);
        }

        const marketJson = await marketRes.json();
        setMarket(marketJson);

        // 🔥 PERFORMANCE NO ES CRÍTICO
        try {
          const perfRes = await perfPromise;

          if (perfRes.ok) {
            const perfJson = await perfRes.json();
            setPerf(perfJson);
          } else {
            console.warn("Performance endpoint failed:", perfRes.status);
            setPerf(null);
          }
        } catch (err) {
          console.warn("Performance fetch error:", err);
          setPerf(null);
        }

      } catch (e) {
        console.error("Global load error:", e);
        setError(e.message || "Error");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading)
    return <div className="global-loading">Loading...</div>;

  if (error)
    return <div className="global-error">{error}</div>;

  return (
    <div className="global-container">
      <div className="global-header">
        <h1>Global</h1>
      </div>

      <div className="global-summary">

        {/* 1️⃣ MARKET MODE */}
        <SummaryCard
          label="Market Mode"
          value={market?.market_mode?.toUpperCase() ?? "—"}
        />

        {/* 2️⃣ REGIME STRENGTH */}
        <SummaryCard
          label="Regime Strength"
          value={
            market?.confidence != null
              ? `${Math.round(market.confidence * 100)}%`
              : "—"
          }
        />

        {/* 3️⃣ TOTAL RETURN */}
        <SummaryCard
          label="Total Return (%)"
          value={
            perf?.total_return_pct != null
              ? `${perf.total_return_pct}%`
              : "—"
          }
        />

        {/* 4️⃣ DRAWDOWN */}
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
