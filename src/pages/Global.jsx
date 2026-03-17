import { useEffect, useState, useCallback } from "react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip
} from "recharts";

import "../styles/global.css";

const API = import.meta.env.VITE_API_URL;

// ─── Helpers ────────────────────────────────────────────
const fmt$ = (n) =>
  n != null ? `$${Math.round(n).toLocaleString("es-CL")}` : "—";

const fmtPct = (n, decimals = 2) =>
  n != null ? `${Number(n).toFixed(decimals)}%` : "—";

const fmtDate = (iso) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("es-CL", {
      day: "2-digit", month: "short", year: "numeric"
    });
  } catch {
    return iso;
  }
};

const fmtTime = (iso) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString("es-CL", {
      hour: "2-digit", minute: "2-digit"
    });
  } catch {
    return iso;
  }
};

// ─── Tooltip personalizado para equity curve ────────────
function EquityTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="equity-tooltip">
      <p className="eq-date">{label}</p>
      <p className="eq-equity">{fmt$(d.equity)}</p>
      <p className={`eq-ret ${d.return_pct >= 0 ? "pos" : "neg"}`}>
        {d.return_pct >= 0 ? "▲" : "▼"} {Math.abs(d.return_pct).toFixed(2)}%
      </p>
      {d.n_trades != null && (
        <p className="eq-trades">{d.n_trades} operación{d.n_trades !== 1 ? "es" : ""}</p>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════
export default function Global() {

  const [market, setMarket]           = useState(null);
  const [perf, setPerf]               = useState(null);
  const [equity, setEquity]           = useState([]);
  const [equityMeta, setEquityMeta]   = useState(null);

  const [marketError, setMarketError] = useState(null);
  const [perfError, setPerfError]     = useState(null);
  const [equityError, setEquityError] = useState(null);

  const [loading, setLoading]         = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  // ── loadData como useCallback para poder referenciarlo en el botón y el interval
  const loadData = useCallback(async () => {
    setLoading(true);
    setMarketError(null);
    setPerfError(null);
    setEquityError(null);

    try {
      const [marketRes, perfRes, equityRes] = await Promise.allSettled([
        fetch(`${API}/dashboard/market-context`, { cache: "no-store" }),
        fetch(`${API}/dashboard/performance`,    { cache: "no-store" }),
        fetch(`${API}/dashboard/equity-curve`,   { cache: "no-store" }),
      ]);

      // Market context
      if (marketRes.status === "fulfilled" && marketRes.value.ok) {
        setMarket(await marketRes.value.json());
      } else {
        setMarketError("No disponible");
      }

      // Performance
      if (perfRes.status === "fulfilled" && perfRes.value.ok) {
        setPerf(await perfRes.value.json());
      } else {
        setPerfError("No disponible");
      }

      // Equity curve
      if (equityRes.status === "fulfilled" && equityRes.value.ok) {
        const data = await equityRes.value.json();
        setEquity(data?.curve || []);
        setEquityMeta({
          n_days:    data?.n_days,
          n_trades:  data?.n_trades,
          updatedAt: data?.updated_at,
        });
      } else {
        setEquityError("Curva no disponible");
      }

      setLastUpdated(new Date().toISOString());

    } catch (e) {
      console.error("Dashboard error", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Auto-refresh cada 60 segundos
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60_000);
    return () => clearInterval(interval);
  }, [loadData]);

  if (loading && !perf && !market)
    return <LoadingSkeleton />;

  const equityNow   = perf?.equity            ?? null;
  const totalReturn = perf?.total_return_pct  ?? null;
  const drawdown    = perf?.drawdown_pct      ?? null;
  const winRate     = Number(perf?.win_rate_pct ?? 0);

  const returnColor = totalReturn == null
    ? "#ffffff"
    : totalReturn >= 0 ? "#22c55e" : "#ef4444";

  const drawdownColor = drawdown != null && drawdown < -5
    ? "#ef4444"
    : "#f97316";

  return (
    <div className="global-container">

      {/* ── HEADER ── */}
      <header className="global-header">
        <h1>Resumen Global del Sistema</h1>
        <div className="header-right">
          {lastUpdated && (
            <span className="last-updated">
              Actualizado {fmtTime(lastUpdated)}
            </span>
          )}
          <div className="status-indicator">
            ● {loading ? "Sincronizando..." : "En línea"}
          </div>
        </div>
      </header>

      {/* ── ERRORES GLOBALES ── */}
      {(marketError || perfError || equityError) && (
        <div className="error-banner">
          {marketError && <span>⚠ Mercado: {marketError}</span>}
          {perfError   && <span>⚠ Performance: {perfError}</span>}
          {equityError && <span>⚠ Equity curve: {equityError}</span>}
        </div>
      )}

      {/* ── KPIs PRINCIPALES ── */}
      <SectionTitle title="KPIs Principales" />
      <div className="dashboard-grid">
        <StatCard label="CAPITAL TOTAL"  value={fmt$(equityNow)} big />
        <StatCard
          label="RETORNO TOTAL"
          value={fmtPct(totalReturn)}
          color={returnColor}
          big
        />
      </div>

      {/* ── EQUITY CURVE ── */}
      {equity.length > 0 ? (
        <>
          <SectionTitle title="Equity Curve" />
          {equityMeta && (
            <p className="curve-meta">
              {equityMeta.n_days} días · {equityMeta.n_trades} operaciones
              {equityMeta.updatedAt && ` · ${fmtDate(equityMeta.updatedAt)}`}
            </p>
          )}
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={equity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="date"
                  stroke="#94a3b8"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(d) => d?.slice(5)}
                />
                <YAxis
                  stroke="#94a3b8"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  width={55}
                />
                <Tooltip content={<EquityTooltip />} />
                <Line
                  type="monotone"
                  dataKey="equity"
                  stroke="#38bdf8"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 5, fill: "#38bdf8" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : (
        equityError
          ? <p className="curve-empty">⚠ {equityError}</p>
          : <p className="curve-empty">Sin historial de operaciones aún.</p>
      )}

      {/* ── ESTADO DEL SISTEMA ── */}
      <SectionTitle title="Estado del Sistema" />
      <div className="dashboard-grid">
        <StatCard
          label="MODO MERCADO"
          value={market?.market_mode?.toUpperCase() || "—"}
        />
        <StatCard
          label="CONFIANZA RÉGIMEN"
          value={
            market?.confidence != null
              ? `${Math.round(market.confidence * 100)}%`
              : "—"
          }
        />
        <StatCard
          label="HIGH WATER MARK"
          value={fmt$(perf?.high_water_mark)}
        />
        <StatCard
          label="ACTIVO DESDE"
          value={fmtDate(perf?.since)}
        />
      </div>

      {/* ── RIESGO ── */}
      <SectionTitle title="Riesgo del Sistema" />
      <div className="dashboard-grid">
        <StatCard
          label="DRAWDOWN ACTUAL"
          value={fmtPct(drawdown)}
          color={drawdownColor}
        />
        <StatCard
          label="MAX DRAWDOWN"
          value={fmtPct(perf?.max_drawdown_pct)}
        />
        <StatCard
          label="RATIO SHARPE"
          value={perf?.sharpe_ratio != null
            ? Number(perf.sharpe_ratio).toFixed(2)
            : "—"}
        />
      </div>

      {/* ── CALIDAD MODELO ── */}
      <SectionTitle title="Calidad del Modelo" />
      <div className="dashboard-grid">

        <div className="stat-card">
          <span className="stat-label">WIN RATE</span>
          <div className="stat-value">{winRate.toFixed(1)}%</div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${winRate}%` }} />
          </div>
        </div>

        <StatCard
          label="ERROR PREDICCIÓN"
          value={fmtPct(perf?.avg_prediction_error_pct, 1)}
        />
        <StatCard
          label="EVALUADAS"
          value={perf?.evaluated_predictions ?? "—"}
        />
        <StatCard
          label="PENDIENTES"
          value={perf?.pending_predictions ?? "—"}
        />

      </div>

      {/* ── ACCIONES ── */}
      <div className="dashboard-actions">
        <button
          onClick={loadData}
          className="refresh-btn"
          disabled={loading}
        >
          {loading ? "Sincronizando..." : "Actualizar"}
        </button>
      </div>

    </div>
  );
}

// ─── Sub-componentes ─────────────────────────────────────

function SectionTitle({ title }) {
  return <h2 className="section-title">{title}</h2>;
}

function StatCard({ label, value, color = "#ffffff", big = false }) {
  return (
    <div className={`stat-card ${big ? "stat-big" : ""}`}>
      <span className="stat-label">{label}</span>
      <div className="stat-value" style={{ color }}>{value}</div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="global-container">
      <div className="global-loader">Sincronizando sistema...</div>
    </div>
  );
}
