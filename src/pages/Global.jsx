import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL;

export default function Global() {
  const [market, setMarket] = useState(null);
  const [perf, setPerf] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // MARKET (real, existe)
        const mRes = await fetch(`${API}/dashboard/market-context`);
        const mJson = await safeJson(mRes);
        setMarket(mJson);

        // PERFORMANCE (endpoint creado)
        const pRes = await fetch(`${API}/dashboard/performance`);
        const pJson = await safeJson(pRes);
        setPerf(pJson);
      } catch (e) {
        console.error("Global load error", e);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) return <div className="global-loading">Loading...</div>;

  const marketMode = market?.market_mode ?? "—";
  const strength =
    market?.confidence != null ? `${Math.round(market.confidence * 100)}%` : "—";

  const equity =
    perf?.equity != null ? `$${Number(perf.equity).toLocaleString()}` : "—";

  const totalReturn =
    perf?.total_return_pct != null ? `${perf.total_return_pct}%` : "—";

  const drawdown =
    perf?.drawdown_pct != null ? `${perf.drawdown_pct}%` : "—";

  const hwm =
    perf?.high_water_mark != null
      ? `$${Number(perf.high_water_mark).toLocaleString()}`
      : "—";

  return (
    <div className="global-container">
      <div className="global-header">
        <h1>Global</h1>
      </div>

      {/* MARKET */}
      <div className="global-section-title">Market</div>
      <div className="global-summary">
        <SummaryCard
          label="Market Mode"
          value={String(marketMode).toUpperCase()}
          mode={marketMode}
        />
        <SummaryCard label="Regime Strength" value={strength} />
      </div>

      {/* PERFORMANCE */}
      <div className="global-section-title">Performance (Alpaca)</div>
      <div className="global-summary">
        <SummaryCard label="Equity" value={equity} />
        <SummaryCard
          label="Total Return"
          value={totalReturn}
          positive={perf?.total_return_pct >= 0}
        />
        <SummaryCard
          label="Drawdown"
          value={drawdown}
          negative={perf?.drawdown_pct < 0}
        />
        <SummaryCard label="High Water Mark" value={hwm} />
      </div>
    </div>
  );
}

function SummaryCard({ label, value, mode, positive, negative }) {
  let className = "summary-card";
  if (mode === "growth") className += " growth";
  if (mode === "neutral") className += " neutral";
  if (mode === "defensive") className += " defensive";
  if (positive) className += " positive";
  if (negative) className += " negative";

  return (
    <div className={className}>
      <div className="summary-label">{label}</div>
      <div className="summary-value">{value}</div>
    </div>
  );
}

async function safeJson(res) {
  // Si el endpoint no existe (404) o falla, devolvemos null sin romper UI.
  if (!res || !res.ok) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
    }
