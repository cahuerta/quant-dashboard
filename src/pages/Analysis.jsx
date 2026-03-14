import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell
} from "recharts";

const API = import.meta.env.VITE_API_URL;

/* =======================================================
   HELPERS
   ======================================================= */

const fmt$ = (v, isChile = false) => {
  if (v == null) return "—";
  return isChile
    ? `$${Math.round(v).toLocaleString("es-CL")}`
    : `$${Number(v).toFixed(2)}`;
};

const fmtPct = (v, decimals = 2) => {
  if (v == null) return "—";
  const n = Number(v);
  return `${n > 0 ? "+" : ""}${n.toFixed(decimals)}%`;
};

/* =======================================================
   HOOK DATA
   ======================================================= */

const useAnalysisData = (ticker, apiUrl) => {
  const [data, setData] = useState({
    meta: null,
    prediction: null,
    historical: null,
    alpha: null,
    full_latest: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  useEffect(() => {
    if (!ticker) {
      setData({ meta: null, prediction: null, historical: null, alpha: null, full_latest: null });
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [resLatest, resAlpha] = await Promise.all([
          fetch(`${apiUrl}/dashboard/latest/${ticker}`, { cache: "no-store" }),
          fetch(`${apiUrl}/alpha`, { cache: "no-store" }),
        ]);

        if (!resLatest.ok) throw new Error(`Latest: ${resLatest.status}`);
        if (!resAlpha.ok)  throw new Error(`Alpha: ${resAlpha.status}`);

        const [jsonLatest, jsonAlpha] = await Promise.all([
          resLatest.json(),
          resAlpha.json(),
        ]);

        if (cancelled) return;

        const last = jsonLatest?.latest || null;

        setData({
          meta:        last?.meta        || null,
          prediction:  last?.prediction  || null,
          historical:  last?.historical  || null,
          alpha:       jsonAlpha?.results?.[ticker] || null,
          full_latest: last,
        });
        setLastFetch(new Date());
      } catch (err) {
        if (!cancelled) setError(err.message || "Error cargando análisis");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    // Refresco automático cada 60s — se cancela al desmontar o cambiar ticker
    const id = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [ticker, apiUrl]);

  return { data, loading, error, lastFetch };
};

/* =======================================================
   MAIN
   ======================================================= */

export default function Analysis() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryTicker = searchParams.get("ticker");

  const [ticker, setTicker]   = useState(queryTicker || "");
  const [tickers, setTickers] = useState([]);

  const { data, loading, error, lastFetch } = useAnalysisData(ticker, API);

  useEffect(() => {
    fetch(`${API}/dashboard/tickers`)
      .then((r) => r.json())
      .then((j) => setTickers(j?.tickers || []))
      .catch(() => setTickers([]));
  }, []);

  useEffect(() => {
    if (ticker) setSearchParams({ ticker }, { replace: true });
    else        setSearchParams({}, { replace: true });
  }, [ticker, setSearchParams]);

  // ── Model Diagnostics H1–H10 ────────────────────────
  // JSON real: models_diagnostics[H].pred_return (no pred_ret)
  const chartDataModels = useMemo(() => {
    const models = data.full_latest?.models_diagnostics;
    if (!models || typeof models !== "object") return [];

    return Object.entries(models)
      .sort((a, b) => (a[1].horizon ?? 0) - (b[1].horizon ?? 0))
      .map(([model, v]) => ({
        model,
        pred:  v?.pred_return != null ? Number(Number(v.pred_return).toFixed(3)) : 0,
        real:  v?.real_return != null ? Number(Number(v.real_return).toFixed(3)) : null,
        error: v?.error_pct   != null ? Number(Number(v.error_pct).toFixed(3))   : null,
      }));
  }, [data.full_latest]);

  // ── Historical metrics como barras comparativas ─────
  // JSON real: historical.{hit_rate_mean, mae_mean, rmse_mean, n_windows}
  // No hay windows[] — mostramos métricas escaladas como chart de referencia
  const chartDataHistorical = useMemo(() => {
    const h = data.historical;
    if (!h) return [];
    return [
      {
        metric: "Hit Rate",
        value:  Number((h.hit_rate_mean * 100).toFixed(1)),
        ref:    50,
        unit:   "%",
      },
      {
        metric: "MAE",
        value:  Number((h.mae_mean * 100).toFixed(2)),
        ref:    null,
        unit:   "%",
      },
      {
        metric: "RMSE",
        value:  Number((h.rmse_mean * 100).toFixed(2)),
        ref:    null,
        unit:   "%",
      },
    ];
  }, [data.historical]);

  // ── Forecast Cone ───────────────────────────────────
  const chartDataFuture = useMemo(() => {
    const curve    = data.full_latest?.price_curve;
    const priceNow = curve?.price_now ?? data.prediction?.price_now ?? 0;
    const hitRate  = Number(data.historical?.hit_rate_mean ?? 0.5);

    if (!curve?.price_path?.length) return [];

    const rows = [{
      label: "Hoy",
      price: priceNow,
      l90: priceNow, l70: priceNow, l50: priceNow,
      u50: priceNow, u70: priceNow, u90: priceNow,
    }];

    curve.price_path.forEach((p, i) => {
      const day     = i + 1;
      const price   = Number(p ?? priceNow);
      const baseVol = price * Math.max(0.008, (1 - hitRate) * 0.05) * Math.min(day / 8, 1.2);

      rows.push({
        label: `T+${day}`,
        price,
        l50: Number((price - baseVol * 0.45).toFixed(2)),
        u50: Number((price + baseVol * 0.45).toFixed(2)),
        l70: Number((price - baseVol * 0.75).toFixed(2)),
        u70: Number((price + baseVol * 0.75).toFixed(2)),
        l90: Number((price - baseVol * 1.15).toFixed(2)),
        u90: Number((price + baseVol * 1.15).toFixed(2)),
      });
    });

    return rows;
  }, [data.full_latest, data.prediction, data.historical]);

  const isChile = ticker.endsWith(".SN") || ticker.endsWith(".CL");

  const handleTickerChange = useCallback((e) => setTicker(e.target.value), []);

  if (error) return (
    <div style={S.page}>
      <div style={S.errorBox}>⚠ {error}</div>
    </div>
  );

  return (
    <div style={S.page}>
      <div style={S.container}>

        {/* ── HEADER ── */}
        <div style={S.header}>
          <div style={{ minWidth: 0 }}>
            <h1 style={S.title}>
              {ticker ? ticker : "---"}
              {ticker && (
                <span style={S.titleSub}>
                  {isChile ? " 🇨🇱" : " 🌎"}
                </span>
              )}
            </h1>
            <p style={S.subtitle}>
              Terminal de Análisis · v3.6
              {lastFetch && (
                <span style={S.lastFetch}>
                  {" "}· {lastFetch.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </p>
          </div>

          <div style={S.selectorWrap}>
            <label style={S.selectorLabel}>Activo</label>
            <select value={ticker} onChange={handleTickerChange} style={S.select}>
              <option value="">Seleccionar activo</option>
              {tickers.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {loading && <div style={S.loadingBox}>Cargando análisis...</div>}
        {!ticker && !loading && (
          <div style={S.emptyBox}>Selecciona un ticker para ver el análisis.</div>
        )}

        {data.prediction && !loading && (
          <div style={S.contentGrid}>

            {/* ── KPIs ── */}
            <div style={S.kpiGrid}>
              <BloqueResumen    prediction={data.prediction} isChile={isChile} />
              <BloqueAlphaScore alphaData={data.alpha} />
              <BloqueRobustez  historical={data.historical} />
              <BloqueEnsemble  fullLatest={data.full_latest} />
            </div>

            {/* ── CHARTS SUPERIORES ── */}
            <div style={S.chartGrid}>
              <ChartHistoricalMetrics data={chartDataHistorical} historical={data.historical} />
              <ChartModelDiagnostics  data={chartDataModels} />
            </div>

            {/* ── FORECAST CONE ── */}
            <ChartForecastCone
              data={chartDataFuture}
              priceNow={data.full_latest?.price_curve?.price_now ?? data.prediction?.price_now}
              isChile={isChile}
            />

          </div>
        )}
      </div>
    </div>
  );
}

/* =======================================================
   CHARTS
   ======================================================= */

// Reemplaza el Backtest (que requería windows[] inexistente)
// Muestra las métricas históricas reales del modelo como barras
const ChartHistoricalMetrics = ({ data, historical }) => {
  const nWindows = historical?.n_windows ?? 0;
  const pca      = historical?.pca_dims  ?? 0;

  return (
    <div style={S.card}>
      <div style={S.cardTitle}>Métricas Históricas del Modelo</div>
      <div style={{ ...S.cardMeta, marginBottom: 12 }}>
        {nWindows} ventanas OOS · {pca} dims PCA
      </div>
      <div style={S.chartWrap}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.07)" />
            <XAxis dataKey="metric" stroke="#94a3b8" tick={{ fontSize: 12 }} />
            <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} unit="%" />
            <Tooltip
              contentStyle={S.tooltip}
              formatter={(v, name) => [`${v}%`, name]}
            />
            <ReferenceLine y={50} stroke="#64748b" strokeDasharray="4 4"
              label={{ value: "50% ref", fill: "#64748b", fontSize: 10 }} />
            <Bar dataKey="value" name="Valor" radius={[6, 6, 0, 0]}>
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={
                    entry.metric === "Hit Rate"
                      ? entry.value >= 52 ? "#22c55e" : entry.value >= 48 ? "#eab308" : "#ef4444"
                      : "#38bdf8"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Model Diagnostics H1–H10
// pred_return es el key correcto del JSON real
const ChartModelDiagnostics = ({ data }) => {
  const hasReal = data.some((d) => d.real != null);

  return (
    <div style={S.card}>
      <div style={S.cardTitle}>Model Diagnostics H1–H10</div>
      <div style={S.chartWrap}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.07)" />
            <XAxis dataKey="model" stroke="#94a3b8" tick={{ fontSize: 12 }} />
            <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} unit="%" />
            <Tooltip
              contentStyle={S.tooltip}
              formatter={(v) => [`${v}%`, ""]}
            />
            <Legend />
            <ReferenceLine y={0} stroke="#64748b" />
            <Bar dataKey="pred" name="Retorno Predicho %" radius={[6, 6, 0, 0]}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.pred >= 0 ? "#38bdf8" : "#ef4444"} />
              ))}
            </Bar>
            {hasReal && (
              <Bar dataKey="real" name="Retorno Real %" fill="#22c55e" radius={[6, 6, 0, 0]} />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Forecast Cone — bandas de incertidumbre H1–H9
const ChartForecastCone = ({ data, priceNow, isChile }) => {
  const fmt = (v) => fmt$(v, isChile);

  if (!data.length) return null;

  return (
    <div style={S.card}>
      <div style={{ ...S.cardTitle, color: "#fbbf24" }}>
        Forecast Cone (H1–H9)
      </div>
      <div style={{ ...S.chartWrap, height: 360 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="cone90" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.08} />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="cone70" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="cone50" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.10} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.07)" />
            <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 12 }} />
            <YAxis
              stroke="#94a3b8"
              tick={{ fontSize: 11 }}
              tickFormatter={fmt}
              width={isChile ? 80 : 65}
            />
            <Tooltip
              contentStyle={S.tooltip}
              formatter={(v, name) => {
                if (["u90","l90","u70","l70","u50","l50"].includes(name)) return null;
                return [fmt(v), name];
              }}
              itemSorter={(a) => (a.dataKey === "price" ? -1 : 1)}
            />
            {priceNow && (
              <ReferenceLine
                y={priceNow}
                stroke="#475569"
                strokeDasharray="4 4"
                label={{ value: "Precio actual", fill: "#94a3b8", fontSize: 11, position: "insideTopRight" }}
              />
            )}

            {/* Banda 90% */}
            <Area type="monotone" dataKey="u90" stroke="none" fill="url(#cone90)" legendType="none" name="u90" />
            <Area type="monotone" dataKey="l90" stroke="none" fill="url(#cone90)" legendType="none" name="l90" />

            {/* Banda 70% */}
            <Area type="monotone" dataKey="u70" stroke="none" fill="url(#cone70)" legendType="none" name="u70" />
            <Area type="monotone" dataKey="l70" stroke="none" fill="url(#cone70)" legendType="none" name="l70" />

            {/* Banda 50% */}
            <Area type="monotone" dataKey="u50" stroke="none" fill="url(#cone50)" legendType="none" name="u50" />
            <Area type="monotone" dataKey="l50" stroke="none" fill="url(#cone50)" legendType="none" name="l50" />

            {/* Trayectoria central */}
            <Line
              type="monotone"
              dataKey="price"
              name="Trayectoria esperada"
              stroke="#fbbf24"
              strokeWidth={3}
              dot={{ r: 3, fill: "#fbbf24" }}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

/* =======================================================
   KPI BLOCKS
   ======================================================= */

function BloqueResumen({ prediction, isChile }) {
  const rec = prediction.recommendation || "HOLD";
  const color =
    rec === "COMPRA"                    ? "#22c55e" :
    rec === "VENTA" || rec === "VENDE"  ? "#ef4444" :
    "#eab308";

  return (
    <div style={{ ...S.card, borderLeft: `4px solid ${color}` }}>
      <div style={S.kpiLabel}>RECOMENDACIÓN</div>
      <div style={{ ...S.kpiBig, color }}>{rec}</div>
      <div style={S.kpiSub}>
        Target {fmtPct(prediction.ret_ens_pct)}
      </div>
      <div style={S.kpiSub}>
        Obj {fmt$(prediction.price_pred, isChile)}
      </div>
      <div style={S.kpiSub}>
        Actual {fmt$(prediction.price_now, isChile)}
      </div>
      <div style={{ ...S.kpiSub, color: "#64748b", fontSize: 13, marginTop: 8 }}>
        θ {prediction.theta_dynamic_pct?.toFixed(3) ?? "—"}%
      </div>
    </div>
  );
}

function BloqueAlphaScore({ alphaData }) {
  const score = Number(alphaData?.alpha_score ?? 0);
  const hasError = !!alphaData?.error;
  const color = hasError ? "#64748b" : score > 0 ? "#22c55e" : score < 0 ? "#ef4444" : "#94a3b8";

  return (
    <div style={{ ...S.card, textAlign: "center" }}>
      <div style={S.kpiLabel}>ALPHA SCORE</div>
      <div style={{ ...S.kpiBig, color }}>{score.toFixed(3)}</div>
      {alphaData?.flags?.v6_3_theta_cleared && (
        <div style={{ ...S.kpiSub, color: "#fbbf24", fontSize: 13 }}>🔥 θ cleared</div>
      )}
      {hasError && (
        <div style={{ ...S.kpiSub, color: "#64748b", fontSize: 12 }}>
          {alphaData.error}
        </div>
      )}
    </div>
  );
}

function BloqueRobustez({ historical }) {
  const hit   = Number((historical?.hit_rate_mean ?? 0) * 100);
  const mae   = Number((historical?.mae_mean ?? 0) * 100);
  const color = hit >= 55 ? "#22c55e" : hit >= 48 ? "#eab308" : "#ef4444";

  return (
    <div style={S.card}>
      <div style={S.kpiLabel}>HIT RATE</div>
      <div style={{ ...S.kpiBig, color }}>{hit.toFixed(1)}%</div>
      <div style={{ ...S.kpiSub, color: "#64748b", fontSize: 13 }}>
        MAE {mae.toFixed(2)}%
      </div>
    </div>
  );
}

function BloqueEnsemble({ fullLatest }) {
  const total  = fullLatest?.ensemble_models ?? 0;
  const models = fullLatest?.models_diagnostics ?? {};
  const count  = Object.keys(models).length;
  const color  = count >= 8 ? "#22c55e" : count >= 5 ? "#eab308" : "#ef4444";

  return (
    <div style={S.card}>
      <div style={S.kpiLabel}>ENSEMBLE</div>
      <div style={{ ...S.kpiBig, color }}>{total}/10</div>
      <div style={{ ...S.kpiSub, color: "#64748b", fontSize: 13 }}>
        {count} con diagnóstico
      </div>
    </div>
  );
}

/* =======================================================
   STYLES
   ======================================================= */

const S = {
  page: {
    minHeight: "100vh",
    background: "radial-gradient(circle at top, rgba(14,165,233,0.10), transparent 30%), linear-gradient(180deg, #06101f 0%, #081427 45%, #09192e 100%)",
    color: "#f8fafc",
    padding: "18px 14px 28px",
  },
  container:    { width: "100%", maxWidth: 1400, margin: "0 auto" },
  header:       { display: "grid", gridTemplateColumns: "1fr auto", alignItems: "start", gap: 16, marginBottom: 22 },
  title:        { margin: 0, fontSize: "clamp(2rem, 5vw, 3.4rem)", lineHeight: 1.02, fontWeight: 800, letterSpacing: "-0.03em" },
  titleSub:     { fontSize: "clamp(1.2rem, 3vw, 2rem)", fontWeight: 400 },
  subtitle:     { marginTop: 10, marginBottom: 0, color: "#94a3b8", fontSize: "1rem" },
  lastFetch:    { color: "#475569", fontSize: "0.85rem" },
  selectorWrap: { display: "flex", flexDirection: "column", gap: 8, width: "100%", maxWidth: 320 },
  selectorLabel:{ color: "#94a3b8", fontSize: 13, fontWeight: 700, letterSpacing: "0.08em" },
  select:       { width: "100%", height: 48, borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", background: "#162338", color: "#f8fafc", padding: "0 14px", fontSize: 16, outline: "none", boxShadow: "0 8px 24px rgba(0,0,0,0.25)" },
  loadingBox:   { padding: 18, borderRadius: 16, background: "rgba(30,41,59,0.85)", color: "#fbbf24", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 16 },
  emptyBox:     { padding: 22, borderRadius: 16, background: "rgba(30,41,59,0.85)", color: "#cbd5e1", border: "1px solid rgba(255,255,255,0.06)" },
  errorBox:     { padding: 18, borderRadius: 16, background: "#3b0d0d", color: "#fecaca", border: "1px solid rgba(239,68,68,0.2)" },
  contentGrid:  { display: "grid", gap: 20 },
  kpiGrid:      { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 },
  chartGrid:    { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 },
  card:         { background: "linear-gradient(180deg, rgba(24,35,56,0.96) 0%, rgba(18,28,46,0.96) 100%)", borderRadius: 22, padding: 22, border: "1px solid rgba(255,255,255,0.06)", boxShadow: "0 14px 36px rgba(0,0,0,0.28)" },
  cardTitle:    { fontSize: 18, fontWeight: 800, marginBottom: 14, color: "#f8fafc" },
  cardMeta:     { fontSize: 12, color: "#64748b" },
  chartWrap:    { width: "100%", height: 280 },
  kpiLabel:     { color: "#94a3b8", fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 10 },
  kpiBig:       { fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 800, lineHeight: 1 },
  kpiSub:       { marginTop: 8, color: "#e2e8f0", fontSize: 15 },
  tooltip:      { background: "#0f172a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, color: "#fff", fontSize: 13 },
};
