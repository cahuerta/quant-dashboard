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

// ─── HitBar horizontal ──────────────────────────────────
function HitBar({ label, value, sublabel }) {
  if (value == null) return null;
  const color  = value >= 55 ? "#22c55e" : value >= 45 ? "#f97316" : "#ef4444";
  const pct    = Math.min(value, 100);
  return (
    <div className="hb-row">
      <div className="hb-meta">
        <span className="hb-label">{label}</span>
        {sublabel && <span className="hb-sub">{sublabel}</span>}
      </div>
      <div className="hb-track">
        <div className="hb-fill" style={{ width: `${pct}%`, background: color }} />
        {/* línea de referencia en 50% */}
        <div className="hb-ref50" />
      </div>
      <span className="hb-value" style={{ color }}>{value.toFixed(1)}%</span>
    </div>
  );
}

// ─── Tarjeta KPI modelo ─────────────────────────────────
function ModelKpi({ label, value, valueColor = "#f8fafc", sub }) {
  return (
    <div className="mkpi-card">
      <span className="mkpi-label">{label}</span>
      <span className="mkpi-value" style={{ color: valueColor }}>{value}</span>
      {sub && <span className="mkpi-sub">{sub}</span>}
    </div>
  );
}

// ════════════════════════════════════════════════════════
export default function Global() {

  const [perf,       setPerf]       = useState(null);
  const [equity,     setEquity]     = useState([]);
  const [equityMeta, setEquityMeta] = useState(null);
  const [model,      setModel]      = useState(null);

  const [loading,     setLoading]     = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [errors,      setErrors]      = useState({});

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
    } else { errs.perf = "No disponible"; }

    if (equityRes.status === "fulfilled" && equityRes.value.ok) {
      const data = await equityRes.value.json();
      setEquity(data?.curve || []);
      setEquityMeta({ n_days: data?.n_days, source: data?.source });
    } else { errs.equity = "Curva no disponible"; }

    if (modelRes.status === "fulfilled" && modelRes.value.ok) {
      setModel(await modelRes.value.json());
    } else { errs.model = "No disponible"; }

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
    return (
      <div className="global-container">
        <div className="global-loader">Sincronizando sistema...</div>
      </div>
    );

  // ── Colores dinámicos ────────────────────────────────
  const totalReturn = perf?.total_return_pct ?? null;
  const returnColor = totalReturn == null ? "#fff"
    : totalReturn >= 0 ? "#22c55e" : "#ef4444";
  const ddColor = (perf?.drawdown_pct ?? 0) < -5 ? "#ef4444" : "#f97316";

  const hitDir   = model?.hit_rate_direction_pct ?? null;
  const hitColor = hitDir == null ? "#fff"
    : hitDir >= 55 ? "#22c55e" : hitDir >= 45 ? "#f97316" : "#ef4444";

  // ── Horizonte H1→H10 ordenado ────────────────────────
  const byHorizon = model?.by_horizon ?? {};
  const horizonRows = Object.entries(byHorizon)
    .filter(([, v]) => v.hit_rate_pct != null)
    .sort(([a], [b]) => parseInt(a.slice(1)) - parseInt(b.slice(1)));

  const bestH = horizonRows.length
    ? horizonRows.reduce((a, b) => a[1].hit_rate_pct >= b[1].hit_rate_pct ? a : b)
    : null;

  // ── Por recomendación ────────────────────────────────
  const byRec = model?.by_recommendation ?? {};
  const recOrder = ["COMPRA", "VENDE", "MANTÉN"];
  const recRows = recOrder
    .filter(r => byRec[r])
    .map(r => ({ rec: r, ...byRec[r] }));

  return (
    <div className="global-container">

      {/* ── HEADER ── */}
      <div className="g-topbar">
        <div className="g-status">
          <span className="g-dot" />
          {loading ? "Sincronizando..." : "En línea"}
        </div>
        {lastUpdated && (
          <span className="g-updated">Actualizado {fmtTime(lastUpdated)}</span>
        )}
      </div>

      {Object.keys(errors).length > 0 && (
        <div className="error-banner">
          {errors.perf   && <span>⚠ Broker: {errors.perf}</span>}
          {errors.equity && <span>⚠ Equity: {errors.equity}</span>}
          {errors.model  && <span>⚠ Modelo: {errors.model}</span>}
        </div>
      )}

      {/* ════════════════════════════════════════════════
          BLOQUE 1 — PERFORMANCE REAL
      ════════════════════════════════════════════════ */}
      <div className="g-section-header">
        <span className="g-section-icon">📈</span>
        <span className="g-section-title">Performance Real</span>
        <span className="g-section-sub">Broker · Alpaca Paper</span>
      </div>

      {/* KPIs broker — fila principal */}
      <div className="g-kpi-row">
        <div className="g-kpi-main">
          <span className="g-kpi-label">Capital Total</span>
          <span className="g-kpi-val">{fmt$(perf?.equity)}</span>
        </div>
        <div className="g-kpi-main" style={{ borderColor: returnColor }}>
          <span className="g-kpi-label">Retorno Total</span>
          <span className="g-kpi-val" style={{ color: returnColor }}>
            {fmtPct(totalReturn)}
          </span>
        </div>
      </div>

      {/* KPIs broker — fila secundaria */}
      <div className="g-kpi-grid">
        <div className="g-kpi-sm">
          <span className="g-kpi-label">Drawdown Actual</span>
          <span className="g-kpi-sm-val" style={{ color: ddColor }}>
            {fmtPct(perf?.drawdown_pct)}
          </span>
        </div>
        <div className="g-kpi-sm">
          <span className="g-kpi-label">High Water Mark</span>
          <span className="g-kpi-sm-val">{fmt$(perf?.high_water_mark)}</span>
        </div>
        <div className="g-kpi-sm">
          <span className="g-kpi-label">Capital Inicial</span>
          <span className="g-kpi-sm-val">{fmt$(perf?.initial_equity)}</span>
        </div>
        <div className="g-kpi-sm">
          <span className="g-kpi-label">Activo Desde</span>
          <span className="g-kpi-sm-val">{fmtDate(perf?.since)}</span>
        </div>
      </div>

      {/* Equity Curve */}
      {equity.length > 0 ? (
        <div className="chart-container">
          <div className="g-chart-meta">
            {equityMeta?.n_days} días
            <span className="g-source-badge">
              {equityMeta?.source === "alpaca" ? "Alpaca" : "local"}
            </span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={equity} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="date"
                stroke="#475569"
                tick={{ fontSize: 10 }}
                tickFormatter={(d) => d?.slice(5)}
              />
              <YAxis
                stroke="#475569"
                tick={{ fontSize: 10 }}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                width={46}
              />
              {perf?.initial_equity && (
                <ReferenceLine
                  y={perf.initial_equity}
                  stroke="#334155"
                  strokeDasharray="4 3"
                  label={{ value: "Base", fill: "#475569", fontSize: 10, position: "insideTopLeft" }}
                />
              )}
              <Tooltip content={<EquityTooltip />} />
              <Line
                type="monotone"
                dataKey="equity"
                stroke="#38bdf8"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#38bdf8" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="curve-empty">
          {errors.equity ? `⚠ ${errors.equity}` : "Sin historial de equity aún."}
        </p>
      )}

      {/* ════════════════════════════════════════════════
          BLOQUE 2 — CALIDAD PREDICTIVA
      ════════════════════════════════════════════════ */}
      <div className="g-section-header" style={{ marginTop: 32 }}>
        <span className="g-section-icon">🎯</span>
        <span className="g-section-title">Calidad Predictiva</span>
        <span className="g-section-sub">Modelo · sin PnL</span>
      </div>

      {/* KPIs modelo — fila */}
      <div className="g-kpi-row">
        <div className="g-kpi-main" style={{ borderColor: hitColor }}>
          <span className="g-kpi-label">Hit Rate Direccional</span>
          <span className="g-kpi-val" style={{ color: hitColor }}>
            {fmtPct(hitDir, 1)}
          </span>
          <span className="g-kpi-hint">% con dirección correcta</span>
        </div>
        <div className="g-kpi-main">
          <span className="g-kpi-label">Error Promedio</span>
          <span className="g-kpi-val" style={{ color: "#f97316" }}>
            {fmtPct(model?.avg_error_pct, 1)}
          </span>
          <span className="g-kpi-hint">desviación predicho vs real</span>
        </div>
      </div>

      {/* Cobertura */}
      <div className="g-coverage-row">
        <div className="g-cov-item">
          <span className="g-cov-num">{model?.evaluated ?? "—"}</span>
          <span className="g-cov-lbl">evaluadas</span>
        </div>
        <div className="g-cov-divider" />
        <div className="g-cov-item">
          <span className="g-cov-num" style={{ color: "#64748b" }}>{model?.pending ?? "—"}</span>
          <span className="g-cov-lbl">pendientes</span>
        </div>
        <div className="g-cov-divider" />
        <div className="g-cov-item">
          <span className="g-cov-num" style={{ color: "#475569" }}>{model?.total ?? "—"}</span>
          <span className="g-cov-lbl">total</span>
        </div>
      </div>

      {/* Por recomendación */}
      {recRows.length > 0 && (
        <div className="g-bars-block">
          <p className="g-bars-title">Por recomendación</p>
          {recRows.map(({ rec, hit_rate_pct, total }) => (
            <HitBar
              key={rec}
              label={rec}
              value={hit_rate_pct}
              sublabel={`${total} pred.`}
            />
          ))}
        </div>
      )}

      {/* Por horizonte */}
      {horizonRows.length > 0 && (
        <div className="g-bars-block">
          <p className="g-bars-title">
            Por horizonte
            {bestH && (
              <span className="g-best-badge">
                Mejor: {bestH[0]} · {bestH[1].hit_rate_pct?.toFixed(1)}%
              </span>
            )}
          </p>
          {horizonRows.map(([h, s]) => (
            <HitBar
              key={h}
              label={h}
              value={s.hit_rate_pct}
              sublabel={`${s.total} pred.`}
            />
          ))}
        </div>
      )}

      {/* ── ACTUALIZAR ── */}
      <div className="dashboard-actions">
        <button onClick={loadData} className="refresh-btn" disabled={loading}>
          {loading ? "Sincronizando..." : "Actualizar"}
        </button>
      </div>

    </div>
  );
}
