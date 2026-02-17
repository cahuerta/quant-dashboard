import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL;

export default function Global() {
  const [market, setMarket] = useState(null);
  const [marketError, setMarketError] = useState(null);
  const [marketLoading, setMarketLoading] = useState(true);

  const [perf, setPerf] = useState(null);
  const [perfError, setPerfError] = useState(null);
  const [perfLoading, setPerfLoading] = useState(true);

  useEffect(() => {
    loadMarket();
    loadPerformance();
  }, []);

  async function loadMarket() {
    try {
      setMarketLoading(true);
      setMarketError(null);

      const res = await fetch(`${API}/dashboard/market-context`, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const json = await res.json();
      setMarket(json);
    } catch (e) {
      setMarketError(e.message);
    } finally {
      setMarketLoading(false);
    }
  }

  async function loadPerformance() {
    try {
      setPerfLoading(true);
      setPerfError(null);

      const res = await fetch(`${API}/dashboard/performance`, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const json = await res.json();
      setPerf(json);
    } catch (e) {
      setPerfError(e.message);
    } finally {
      setPerfLoading(false);
    }
  }

  return (
    <div className="global-container">
      <div className="global-header">
        <h1>Resumen Global</h1>
      </div>

      <div className="global-summary">

        {/* ================= MARKET MODE ================= */}
        <SummaryCard
          label="Modo de Mercado"
          loading={marketLoading}
          error={marketError}
          value={
            market?.market_mode
              ? market.market_mode.toUpperCase()
              : null
          }
        />

        <SummaryCard
          label="Confianza Régimen"
          loading={marketLoading}
          error={marketError}
          value={
            market?.confidence != null
              ? `${Math.round(market.confidence * 100)}%`
              : null
          }
        />

        {/* ================= PERFORMANCE ================= */}
        <SummaryCard
          label="Retorno Total"
          loading={perfLoading}
          error={perfError}
          value={
            perf?.total_return_pct != null
              ? `${perf.total_return_pct}%`
              : null
          }
        />

        <SummaryCard
          label="Drawdown Actual"
          loading={perfLoading}
          error={perfError}
          value={
            perf?.drawdown_pct != null
              ? `${perf.drawdown_pct}%`
              : null
          }
        />

      </div>
    </div>
  );
}

/* ===================================================== */

function SummaryCard({ label, value, loading, error }) {
  return (
    <div className="summary-card">
      <div className="summary-label">{label}</div>

      {loading && (
        <div className="summary-value" style={{ opacity: 0.6 }}>
          Cargando...
        </div>
      )}

      {!loading && error && (
        <div className="summary-value" style={{ color: "#ef4444" }}>
          Error: {error}
        </div>
      )}

      {!loading && !error && (
        <div className="summary-value">
          {value ?? "—"}
        </div>
      )}
    </div>
  );
}
