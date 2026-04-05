import { useEffect, useState, useCallback } from "react";
import {
  LineChart, Line, ResponsiveContainer,
  CartesianGrid, XAxis, YAxis, Tooltip, ReferenceLine
} from "recharts";
import "../styles/global.css";

const API = import.meta.env.VITE_API_URL;

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

function HitBar({ label, value, sublabel }) {
  if (value == null) return null;
  const color = value >= 55 ? "#22c55e" : value >= 45 ? "#f97316" : "#ef4444";
  return (
    <div className="hb-row">
      <div className="hb-meta">
        <span className="hb-label">{label}</span>
        {sublabel && <span className="hb-sub">{sublabel}</span>}
      </div>
      <div className="hb-track">
        <div className="hb-fill" style={{ width: `${Math.min(value, 100)}%`, background: color }} />
        <div className="hb-ref50" />
      </div>
      <span className="hb-value" style={{ color }}>{value.toFixed(1)}%</span>
    </div>
  );
}

export default function Global() {
  const [perf,       setPerf]       = useState(null);
  const [equity,     setEquity]     = useState([]);
  const [equityMeta, setEquityMeta] = useState(null);
  const [model,      setModel]      = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [lastUpdated,setLastUpdated]= useState(null);
  const [errors,     setErrors]     = useState({});

  const [analysis,      setAnalysis]      = useState(null);
  const [analysisStatus,setAnalysisStatus]= useState("idle"); // idle | running | ready | error

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrors({});

    const [perfRes, equityRes, modelRes] = await Promise.allSettled([
      fetch(`${API}/dashboard/performance`,   { cache: "no-store" }),
      fetch(`${API}/dashboard/equity-curve`,  { cache: "no-store" }),
      fetch(`${API}/dashboard/model-quality`, { cache: "no-store" }),
    ]);

    const errs = {};

    if (perfRes.status === "fulfilled" && perfRes.value.ok)
      setPerf(await perfRes.value.json());
    else errs.perf = "No disponible";

    if (equityRes.status === "fulfilled" && equityRes.value.ok) {
      const data = await equityRes.value.json();
      setEquity(data?.curve || []);
      setEquityMeta({ n_days: data?.n_days, source: data?.source });
    } else errs.equity = "Curva no disponible";

    if (modelRes.status === "fulfilled" && modelRes.value.ok)
      setModel(await modelRes.value.json());
    else errs.model = "No disponible";

    setErrors(errs);
    setLastUpdated(new Date().toISOString());
    setLoading(false);

    // Cargar análisis cacheado si existe
    try {
      const r = await fetch(`${API}/dashboard/order-analysis`, { cache: "no-store" });
      if (r.ok) {
        const d = await r.json();
        if (d.status === "ready") setAnalysis(d);
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    loadData();
    const iv = setInterval(loadData, 60_000);
    return () => clearInterval(iv);
  }, [loadData]);

  const runAnalysis = useCallback(async () => {
    setAnalysisStatus("running");
    try {
      await fetch(`${API}/dashboard/order-analysis/run`, { method: "POST" });
      // Polling hasta que esté listo
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        const r = await fetch(`${API}/dashboard/order-analysis`, { cache: "no-store" });
        if (r.ok) {
          const d = await r.json();
          if (d.status === "ready") {
            setAnalysis(d);
            setAnalysisStatus("ready");
            clearInterval(poll);
          }
        }
        if (attempts > 20) { // timeout 20s
          setAnalysisStatus("error");
          clearInterval(poll);
        }
      }, 1000);
    } catch (_) {
      setAnalysisStatus("error");
    }
  }, []);

  if (loading && !perf && !model)
    return (
      <div className="global-container">
        <div className="global-loader">Sincronizando sistema...</div>
      </div>
    );

  const totalReturn = perf?.total_return_pct ?? null;
  const returnColor = totalReturn == null ? "#fff" : totalReturn >= 0 ? "#22c55e" : "#ef4444";
  const ddColor     = (perf?.drawdown_pct ?? 0) < -5 ? "#ef4444" : "#f97316";
  const hitDir      = model?.hit_rate_direction_pct ?? null;
  const hitColor    = hitDir == null ? "#fff" : hitDir >= 55 ? "#22c55e" : hitDir >= 45 ? "#f97316" : "#ef4444";

  const byHorizon  = model?.by_horizon ?? {};
  const horizonRows = Object.entries(byHorizon)
    .filter(([, v]) => v.hit_rate_pct != null)
    .sort(([a], [b]) => parseInt(a.slice(1)) - parseInt(b.slice(1)));
  const bestH = horizonRows.length
    ? horizonRows.reduce((a, b) => a[1].hit_rate_pct >= b[1].hit_rate_pct ? a : b)
    : null;

  const byRec   = model?.by_recommendation ?? {};
  const recRows = ["COMPRA","VENDE","MANTÉN"]
    .filter(r => byRec[r])
    .map(r => ({ rec: r, ...byRec[r] }));

  return (
    <div className="global-container">

      {/* ── TOPBAR ── */}
      <div className="g-topbar">
        <div className="g-status">
          <span className="g-dot" />
          {loading ? "Sincronizando..." : "En línea"}
        </div>
        {lastUpdated && (
          <span className="g-updated">Act. {fmtTime(lastUpdated)}</span>
        )}
      </div>

      {Object.keys(errors).length > 0 && (
        <div className="error-banner">
          {errors.perf   && <span>⚠ Broker: {errors.perf}</span>}
          {errors.equity && <span>⚠ Equity: {errors.equity}</span>}
          {errors.model  && <span>⚠ Modelo: {errors.model}</span>}
        </div>
      )}

      {/* ════════════════════════════════
          BLOQUE 1 — PERFORMANCE REAL
      ════════════════════════════════ */}
      <div className="g-section-header">
        <span className="g-section-icon">📈</span>
        <div>
          <div className="g-section-title">Performance Real</div>
          <div className="g-section-sub">Broker · Alpaca Paper</div>
        </div>
      </div>

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

      <div className="g-kpi-grid">
        <div className="g-kpi-sm">
          <span className="g-kpi-label">Drawdown Actual</span>
          <span className="g-kpi-sm-val" style={{ color: ddColor }}>{fmtPct(perf?.drawdown_pct)}</span>
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

      {equity.length > 0 ? (
        <div className="chart-container">
          <div className="g-chart-meta">
            {equityMeta?.n_days} días
            <span className="g-source-badge">
              {equityMeta?.source === "alpaca" ? "Alpaca" : "local"}
            </span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={equity} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="date" stroke="#475569"
                tick={{ fontSize: 10 }}
                tickFormatter={(d) => d?.slice(5)}
              />
              <YAxis
                stroke="#475569" tick={{ fontSize: 10 }}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                width={44}
              />
              {perf?.initial_equity && (
                <ReferenceLine y={perf.initial_equity} stroke="#334155" strokeDasharray="4 3" />
              )}
              <Tooltip content={<EquityTooltip />} />
              <Line type="monotone" dataKey="equity"
                stroke="#38bdf8" strokeWidth={2} dot={false}
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

      {/* ════════════════════════════════
          BLOQUE 2 — CALIDAD PREDICTIVA
      ════════════════════════════════ */}
      <div className="g-section-header" style={{ marginTop: 36 }}>
        <span className="g-section-icon">🎯</span>
        <div>
          <div className="g-section-title">Calidad Predictiva</div>
          <div className="g-section-sub">Modelo · sin PnL real</div>
        </div>
        {model?.trend && (
          <span className={`g-trend-badge g-trend-${model.trend}`}>
            {model.trend === "mejorando"   ? "▲ Mejorando"   :
             model.trend === "empeorando" ? "▼ Empeorando" : "→ Estable"}
          </span>
        )}
      </div>

      {/* Hit rate histórico vs reciente */}
      <div className="g-kpi-row">
        <div className="g-kpi-main" style={{ borderColor: hitColor }}>
          <span className="g-kpi-label">Hit Rate Histórico</span>
          <span className="g-kpi-val" style={{ color: hitColor }}>{fmtPct(hitDir, 1)}</span>
          <span className="g-kpi-hint">todas las evaluaciones</span>
        </div>
        <div className="g-kpi-main">
          <span className="g-kpi-label">Error Promedio</span>
          <span className="g-kpi-val" style={{ color: "#f97316" }}>{fmtPct(model?.avg_error_pct, 1)}</span>
          <span className="g-kpi-hint">predicho vs real</span>
        </div>
      </div>

      {/* Ventanas recientes — tendencia del fix */}
      {(model?.hit_rate_7d_pct != null || model?.hit_rate_14d_pct != null || model?.hit_rate_30d_pct != null) && (
        <div className="g-bars-block">
          <p className="g-bars-title">Tendencia reciente</p>

          {model?.hit_rate_7d_pct != null && (
            <HitBar
              label="7 días"
              value={model.hit_rate_7d_pct}
              sublabel={`${model.recent_window_sizes?.["7d"] ?? "—"} eval.`}
            />
          )}
          {model?.hit_rate_14d_pct != null && (
            <HitBar
              label="14 días"
              value={model.hit_rate_14d_pct}
              sublabel={`${model.recent_window_sizes?.["14d"] ?? "—"} eval.`}
            />
          )}
          {model?.hit_rate_30d_pct != null && (
            <HitBar
              label="30 días"
              value={model.hit_rate_30d_pct}
              sublabel={`${model.recent_window_sizes?.["30d"] ?? "—"} eval.`}
            />
          )}

          {/* Línea histórica como referencia */}
          {hitDir != null && (
            <div className="g-hist-ref">
              <span>Histórico total</span>
              <span style={{ color: hitColor }}>{fmtPct(hitDir, 1)}</span>
            </div>
          )}
        </div>
      )}

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

      {recRows.length > 0 && (
        <div className="g-bars-block">
          <p className="g-bars-title">Por recomendación</p>
          {recRows.map(({ rec, hit_rate_pct, total }) => (
            <HitBar key={rec} label={rec} value={hit_rate_pct} sublabel={`${total} pred.`} />
          ))}
        </div>
      )}

      {horizonRows.length > 0 && (
        <div className="g-bars-block">
          <p className="g-bars-title">
            Por horizonte
            {bestH && (
              <span className="g-best-badge">Mejor: {bestH[0]} · {bestH[1].hit_rate_pct?.toFixed(1)}%</span>
            )}
          </p>
          {horizonRows.map(([h, s]) => (
            <HitBar key={h} label={h} value={s.hit_rate_pct} sublabel={`${s.total}`} />
          ))}
        </div>
      )}

      {/* ════════════════════════════════
          BLOQUE 3 — SISTEMA vs MANUAL
      ════════════════════════════════ */}
      <div className="g-section-header" style={{ marginTop: 36 }}>
        <span className="g-section-icon">⚔️</span>
        <div>
          <div className="g-section-title">Sistema vs Manual</div>
          <div className="g-section-sub">Análisis de órdenes · Alpaca</div>
        </div>
      </div>

      {!analysis && analysisStatus !== "running" && (
        <div className="g-analysis-empty">
          <p>Análisis no ejecutado aún.</p>
          <button className="g-run-btn" onClick={runAnalysis}>
            ▶ Correr análisis
          </button>
        </div>
      )}

      {analysisStatus === "running" && (
        <div className="g-analysis-loading">
          <span className="g-spin">⟳</span> Analizando órdenes...
        </div>
      )}

      {analysis && analysis.status === "ready" && (() => {
        const sys = analysis.system_buys;
        const man = analysis.manual_buys;
        const uni = analysis.universe;
        const verdict = analysis.verdict;

        const winnerColor = verdict?.winner === "manual" ? "#22c55e"
          : verdict?.winner === "system" ? "#38bdf8" : "#94a3b8";

        return (
          <>
            {/* Veredicto */}
            <div className="g-verdict-card" style={{ borderColor: winnerColor }}>
              <span className="g-verdict-icon">
                {verdict?.winner === "manual" ? "🧠" : verdict?.winner === "system" ? "🤖" : "🤝"}
              </span>
              <div>
                <div className="g-verdict-text" style={{ color: winnerColor }}>
                  {verdict?.text}
                </div>
                <div className="g-verdict-sub">
                  Baseline universo: {verdict?.universe_baseline}%
                </div>
              </div>
            </div>

            {/* Comparación hit rate */}
            <div className="g-compare-grid">
              {[
                { label: "🤖 Sistema", data: sys, color: "#38bdf8" },
                { label: "🧠 Manual",  data: man, color: "#22c55e" },
              ].map(({ label, data, color }) => data && (
                <div key={label} className="g-compare-card">
                  <span className="g-compare-label">{label}</span>
                  <span className="g-compare-val" style={{ color }}>
                    {data.hit_rate_dir_pct != null ? `${data.hit_rate_dir_pct}%` : "—"}
                  </span>
                  <span className="g-compare-sub">hit rate dir.</span>
                  <div className="g-compare-row">
                    <span>Retorno prom.</span>
                    <span style={{ color: (data.avg_real_return ?? 0) >= 0 ? "#22c55e" : "#ef4444" }}>
                      {data.avg_real_return != null ? `${data.avg_real_return}%` : "—"}
                    </span>
                  </div>
                  <div className="g-compare-row">
                    <span>Tickers</span>
                    <span>{data.tickers_found}</span>
                  </div>
                  <div className="g-compare-row">
                    <span>Evaluaciones</span>
                    <span>{data.total_evaluations}</span>
                  </div>
                  {data.best_horizon && (
                    <div className="g-compare-row">
                      <span>Mejor horizonte</span>
                      <span style={{ color: "#f97316" }}>{data.best_horizon}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* COMPRA hit rate por grupo */}
            {(sys?.by_recommendation?.COMPRA || man?.by_recommendation?.COMPRA) && (
              <div className="g-bars-block">
                <p className="g-bars-title">Hit rate COMPRA por origen</p>
                {sys?.by_recommendation?.COMPRA && (
                  <HitBar
                    label="🤖 Sistema"
                    value={sys.by_recommendation.COMPRA.hit_rate_pct}
                    sublabel={`${sys.by_recommendation.COMPRA.total} pred.`}
                  />
                )}
                {man?.by_recommendation?.COMPRA && (
                  <HitBar
                    label="🧠 Manual"
                    value={man.by_recommendation.COMPRA.hit_rate_pct}
                    sublabel={`${man.by_recommendation.COMPRA.total} pred.`}
                  />
                )}
              </div>
            )}

            <div className="g-analysis-footer">
              <span className="g-updated">
                Generado {analysis.generated_at ? new Date(analysis.generated_at).toLocaleString("es-CL") : "—"}
              </span>
              <button
                className="g-run-btn g-run-btn-sm"
                onClick={runAnalysis}
                disabled={analysisStatus === "running"}
              >
                ↺ Actualizar análisis
              </button>
            </div>
          </>
        );
      })()}

      <div className="dashboard-actions">
        <button onClick={loadData} className="refresh-btn" disabled={loading}>
          {loading ? "Sincronizando..." : "Actualizar"}
        </button>
      </div>

    </div>
  );
}
