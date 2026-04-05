import { useEffect, useState, useCallback } from "react";
import {
  LineChart, Line, ResponsiveContainer,
  CartesianGrid, XAxis, YAxis, Tooltip, ReferenceLine
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
  } catch { return iso; }
};

const fmtTime = (iso) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString("es-CL", {
      hour: "2-digit", minute: "2-digit"
    });
  } catch { return iso; }
};

// ─── Tooltip equity ─────────────────────────────────────
function EquityTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="equity-tooltip">
      <p className="eq-date">{d.date}</p>
      <p className="eq-equity">{fmt$(d.equity)}</p>
      {d.return_pct != null && (
        <p className={`eq-ret ${d.return_pct >= 0 ? "pos" : "neg"}`}>
          {d.return_pct >= 0 ? "▲" : "▼"} {Math.abs(d.return_pct).toFixed(2)}%
        </p>
      )}
    </div>
  );
}

// ─── Barra de hit rate con color ────────────────────────
function HitBar({ value, label }) {
  if (value == null) return null;
  const color = value >= 55 ? "#22c55e" : value >= 45 ? "#f97316" : "#ef4444";
  return (
    <div className="hit-bar-wrap">
      <div className="hit-bar-label">{label}</div>
      <div className="hit-bar-track">
        <div className="hit-bar-fill" style={{ width: `${value}%`, background: color }} />
        <span className="hit-bar-value" style={{ color }}>{value.toFixed(1)}%</span>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
export default function Global() {

  const [perf,    setPerf]    = useState(null);
  const [equity,  setEquity]  = useState([]);
  const [equityMeta, setEquityMeta] = useState(null);
  const [model,   setModel]   = useState(null);

  const [loading,  setLoading]  = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [errors,   setErrors]   = useState({});

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrors({});

    const [perfRes, equityRes, modelRes] = await Promise.allSettled([
      fetch(`${API}/dashboard/performance`,   { cache: "no-store" }),
      fetch(`${API}/dashboard/equity-curve`,  { cache: "no-store" }),
      fetch(`${API}/dashboard/model-quality`, { cache: "no-store" }),
    ]);

    const errs = {};

    if (perfRes.status === "fulfilled" && perfRes.value.ok) {
      setPerf(await perfRes.value.json());
    } else {
      errs.perf = "No disponible";
    }

    if (equityRes.status === "fulfilled" && equityRes.value.ok) {
      const data = await equityRes.value.json();
      setEquity(data?.curve || []);
      setEquityMeta({
        n_days:    data?.n_days,
        source:    data?.source,
        updatedAt: data?.updated_at,
      });
    } else {
      errs.equity = "Curva no disponible";
    }

    if (modelRes.status === "fulfilled" && modelRes.value.ok) {
      setModel(await modelRes.value.json());
    } else {
      errs.model = "No disponible";
    }

    setErrors(errs);
    setLastUpdated(new Date().toISOString());
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const iv = setInterval(loadData, 60_000);
    return () => clearInterval(iv);
  }, [loadData]);

  if (loading && !perf && !model)
    return <div className="global-container"><div className="global-loader">Sincronizando sistema...</div></div>;

  const totalReturn = perf?.total_return_pct ?? null;
  const returnColor = totalReturn == null ? "#fff" : totalReturn >= 0 ? "#22c55e" : "#ef4444";
  const ddColor = (perf?.drawdown_pct ?? 0) < -5 ? "#ef4444" : "#f97316";

  // ── Horizonte mejor y peor ───────────────────────────
  const byHorizon = model?.by_horizon ?? {};
  const horizonEntries = Object.entries(byHorizon)
    .filter(([, v]) => v.hit_rate_pct != null)
    .sort(([a], [b]) => parseInt(a.slice(1)) - parseInt(b.slice(1)));

  const bestHorizon = horizonEntries.length
    ? horizonEntries.reduce((a, b) => a[1].hit_rate_pct >= b[1].hit_rate_pct ? a : b)
    : null;

  return (
    <div className="global-container">

      {/* ── HEADER ── */}
      <header className="global-header">
        <h1>Quant Enterprise</h1>
        <div className="header-right">
          {lastUpdated && <span className="last-updated">Actualizado {fmtTime(lastUpdated)}</span>}
          <div className="status-indicator">● {loading ? "Sincronizando..." : "En línea"}</div>
        </div>
      </header>

      {Object.keys(errors).length > 0 && (
        <div className="error-banner">
          {errors.perf   && <span>⚠ Broker: {errors.perf}</span>}
          {errors.equity && <span>⚠ Equity: {errors.equity}</span>}
          {errors.model  && <span>⚠ Modelo: {errors.model}</span>}
        </div>
      )}

      {/* ════════════════════════════════════════════════
          BLOQUE 1: PERFORMANCE REAL (BROKER)
      ════════════════════════════════════════════════ */}
      <SectionTitle title="📈 Performance Real (Broker)" />

      <div className="dashboard-grid">
        <StatCard label="CAPITAL TOTAL"  value={fmt$(perf?.equity)} big />
        <StatCard label="RETORNO TOTAL"  value={fmtPct(totalReturn)} color={returnColor} big />
        <StatCard label="DRAWDOWN ACTUAL" value={fmtPct(perf?.drawdown_pct)} color={ddColor} />
        <StatCard label="HIGH WATER MARK" value={fmt$(perf?.high_water_mark)} />
        <StatCard label="CAPITAL INICIAL" value={fmt$(perf?.initial_equity)} />
        <StatCard label="ACTIVO DESDE"    value={fmtDate(perf?.since)} />
      </div>

      {/* Equity Curve real */}
      {equity.length > 0 ? (
        <>
          <div className="curve-header">
            <span className="curve-meta">
              {equityMeta?.n_days} días
              {equityMeta?.source === "snapshots" && " · desde snapshots locales"}
              {equityMeta?.source === "alpaca"    && " · desde Alpaca"}
            </span>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={260}>
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
                  width={52}
                />
                <ReferenceLine
                  y={perf?.initial_equity}
                  stroke="#475569"
                  strokeDasharray="4 4"
                />
                <Tooltip content={<EquityTooltip />} />
                <Line
                  type="monotone"
                  dataKey="equity"
                  stroke="#38bdf8"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : (
        <p className="curve-empty">
          {errors.equity ? `⚠ ${errors.equity}` : "Sin historial de equity aún."}
        </p>
      )}

      {/* ════════════════════════════════════════════════
          BLOQUE 2: CALIDAD PREDICTIVA (MODELO)
      ════════════════════════════════════════════════ */}
      <SectionTitle title="🎯 Calidad Predictiva (Modelo)" />

      <div className="model-summary-row">
        <div className="model-kpi-card">
          <span className="stat-label">HIT RATE DIRECCIONAL</span>
          <div
            className="stat-value-lg"
            style={{
              color: (model?.hit_rate_direction_pct ?? 0) >= 50 ? "#22c55e" : "#ef4444"
            }}
          >
            {fmtPct(model?.hit_rate_direction_pct, 1)}
          </div>
          <span className="stat-sublabel">% predicciones con dirección correcta</span>
        </div>

        <div className="model-kpi-card">
          <span className="stat-label">ERROR PROMEDIO</span>
          <div className="stat-value-lg" style={{ color: "#f97316" }}>
            {fmtPct(model?.avg_error_pct, 1)}
          </div>
          <span className="stat-sublabel">desviación retorno predicho vs real</span>
        </div>

        <div className="model-kpi-card">
          <span className="stat-label">COBERTURA</span>
          <div className="stat-value-lg" style={{ color: "#94a3b8" }}>
            {model?.evaluated ?? "—"}<span style={{ fontSize: "0.6em", color: "#64748b" }}>/{model?.total ?? "—"}</span>
          </div>
          <span className="stat-sublabel">{model?.pending ?? 0} pendientes</span>
        </div>
      </div>

      {/* Hit rate por recomendación */}
      {model?.by_recommendation && Object.keys(model.by_recommendation).length > 0 && (
        <>
          <p className="subsection-label">Por recomendación</p>
          <div className="hit-bars-container">
            {Object.entries(model.by_recommendation).map(([rec, s]) => (
              <HitBar
                key={rec}
                label={`${rec} (${s.total})`}
                value={s.hit_rate_pct}
              />
            ))}
          </div>
        </>
      )}

      {/* Hit rate por horizonte H1→H10 */}
      {horizonEntries.length > 0 && (
        <>
          <p className="subsection-label">
            Por horizonte
            {bestHorizon && (
              <span className="best-horizon-badge">
                Mejor: {bestHorizon[0]} ({bestHorizon[1].hit_rate_pct?.toFixed(1)}%)
              </span>
            )}
          </p>
          <div className="hit-bars-container">
            {horizonEntries.map(([h, s]) => (
              <HitBar
                key={h}
                label={`${h} (${s.total})`}
                value={s.hit_rate_pct}
              />
            ))}
          </div>
        </>
      )}

      {/* ── ACCIONES ── */}
      <div className="dashboard-actions">
        <button onClick={loadData} className="refresh-btn" disabled={loading}>
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
  
