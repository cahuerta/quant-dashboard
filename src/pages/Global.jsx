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

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

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

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

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
        <h1>Resumen Global del Modelo</h1>
      </div>

      {/* ================= CONTEXTO MERCADO ================= */}
      <SectionTitle title="Contexto de Mercado" />

      <div className="global-summary">
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
          label="Confianza del Régimen"
          loading={marketLoading}
          error={marketError}
          value={
            market?.confidence != null
              ? `${Math.round(market.confidence * 100)}%`
              : null
          }
        />
      </div>

      {/* ================= RENDIMIENTO HISTÓRICO ================= */}
      <SectionTitle title="Rendimiento Histórico" />

      <div className="global-summary">
        <SummaryCard
          label="Retorno Total Acumulado"
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

        <SummaryCard
          label="Máximo Drawdown Histórico"
          loading={perfLoading}
          error={perfError}
          value={
            perf?.max_drawdown_pct != null
              ? `${perf.max_drawdown_pct}%`
              : null
          }
        />

        <SummaryCard
          label="Ratio Sharpe"
          loading={perfLoading}
          error={perfError}
          value={
            perf?.sharpe_ratio != null
              ? perf.sharpe_ratio.toFixed(2)
              : null
          }
        />
      </div>

      {/* ================= CALIDAD DEL MODELO ================= */}
      <SectionTitle title="Calidad del Modelo" />

      <div className="global-summary">
        <SummaryCard
          label="Tasa de Acierto Histórica"
          loading={perfLoading}
          error={perfError}
          value={
            perf?.win_rate_pct != null
              ? `${perf.win_rate_pct}%`
              : null
          }
        />

        <SummaryCard
          label="Error Promedio de Predicción"
          loading={perfLoading}
          error={perfError}
          value={
            perf?.avg_prediction_error_pct != null
              ? `${perf.avg_prediction_error_pct}%`
              : null
          }
        />

        <SummaryCard
          label="Total de Predicciones Generadas"
          loading={perfLoading}
          error={perfError}
          value={perf?.total_predictions ?? null}
        />

        <SummaryCard
          label="Predicciones Evaluadas"
          loading={perfLoading}
          error={perfError}
          value={perf?.evaluated_predictions ?? null}
        />

        <SummaryCard
          label="Predicciones Pendientes"
          loading={perfLoading}
          error={perfError}
          value={perf?.pending_predictions ?? null}
        />
      </div>
    </div>
  );
}

/* ===================================================== */

function SectionTitle({ title }) {
  return (
    <h2 style={{ marginTop: 40, marginBottom: 15 }}>
      {title}
    </h2>
  );
}

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
