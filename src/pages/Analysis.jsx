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
  Bar
} from "recharts";

const API = import.meta.env.VITE_API_URL;

/* =======================================================
   HOOK DATA
   ======================================================= */

const useAnalysisData = (ticker, apiUrl) => {
  const [data, setData] = useState({
    meta: null,
    prediction: null,
    historical: null,
    alpha: null,
    full_latest: null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!ticker) {
      setData({ meta: null, prediction: null, historical: null, alpha: null, full_latest: null });
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [resLatest, resAlpha] = await Promise.all([
          fetch(`${apiUrl}/dashboard/latest/${ticker}`, { cache: "no-store" }),
          fetch(`${apiUrl}/alpha`, { cache: "no-store" })
        ]);

        if (!resLatest.ok) throw new Error("Latest endpoint error");
        if (!resAlpha.ok)  throw new Error("Alpha endpoint error");

        const [jsonLatest, jsonAlpha] = await Promise.all([
          resLatest.json(),
          resAlpha.json()
        ]);

        const last = jsonLatest?.latest || null;

        setData({
          meta:        last?.meta       || null,
          prediction:  last?.prediction || null,
          historical:  last?.historical || null,
          alpha:       jsonAlpha?.results?.[ticker] || null,
          full_latest: last
        });
      } catch (err) {
        setError(err.message || "Error cargando análisis");
      } finally {
        setLoading(false);
      }
    };

    load();

    // Refresco automático cada 60s mientras el mercado está abierto
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [ticker, apiUrl]);

  return { data, loading, error };
};

/* =======================================================
   MAIN
   ======================================================= */

export default function Analysis() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryTicker = searchParams.get("ticker");

  const [ticker, setTicker]   = useState(queryTicker || "");
  const [tickers, setTickers] = useState([]);

  const { data, loading, error } = useAnalysisData(ticker, API);

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

  // ── Backtest histórico ──────────────────────────────
  const chartDataHistorical = useMemo(() => {
    if (!data.historical?.windows || !Array.isArray(data.historical.windows)) return [];
    return data.historical.windows.map((w, i) => ({
      name: `W${i + 1}`,
      real: Number(((w?.ret_real ?? 0) * 100).toFixed(2)),
      pred: Number(((w?.ret_pred ?? 0) * 100).toFixed(2))
    }));
  }, [data.historical]);

  // ── Model Diagnostics H1-H10 ────────────────────────
  // Usa models_diagnostics del JSON final (guardado por el orchestrator)
  // Si real_return existe (viene del evaluator), lo muestra también
  const chartDataModels = useMemo(() => {
    const models = data.full_latest?.models_diagnostics;
    if (!models || typeof models !== "object") return [];

    return Object.entries(models)
      .sort((a, b) => a[1].horizon - b[1].horizon)
      .map(([model, v]) => ({
        model,
        pred:  v?.pred_return  != null ? Number(v.pred_return.toFixed(2))  : 0,
        real:  v?.real_return  != null ? Number(v.real_return.toFixed(2))  : null,
        error: v?.error_pct    != null ? Number(v.error_pct.toFixed(2))    : null,
      }));
  }, [data.full_latest]);

  // ── Forecast Cone ───────────────────────────────────
  // Usa price_curve.price_now del JSON (guardado por el orchestrator)
  const chartDataFuture = useMemo(() => {
    const curve    = data.full_latest?.price_curve;
    const priceNow = curve?.price_now ?? data.prediction?.price_now ?? 0;
    const hitRate  = Number(data.historical?.hit_rate_mean ?? 0.5);

    if (!curve?.price_path?.length) return [];

    const rows = [{
      label: "Hoy",
      price: priceNow,
      l90: priceNow, l70: priceNow, l50: priceNow,
      u50: priceNow, u70: priceNow, u90: priceNow
    }];

    curve.price_path.forEach((p, i) => {
      const day     = i + 1;
      const price   = Number(p ?? priceNow);
      const baseVol = price * Math.max(0.08, (1 - hitRate) * 0.05) * Math.min(day / 8, 1.2);

      rows.push({
        label: `T+${day}`,
        price,
        l50: Number((price - baseVol * 0.45).toFixed(2)),
        u50: Number((price + baseVol * 0.45).toFixed(2)),
        l70: Number((price - baseVol * 0.75).toFixed(2)),
        u70: Number((price + baseVol * 0.75).toFixed(2)),
        l90: Number((price - baseVol * 1.15).toFixed(2)),
        u90: Number((price + baseVol * 1.15).toFixed(2))
      });
    });

    return rows;
  }, [data.full_latest, data.prediction, data.historical]);

  const isChile = ticker.endsWith(".SN") || ticker.endsWith(".CL");

  const handleTickerChange = useCallback((e) => setTicker(e.target.value), []);

  if (error) return <div style={styles.page}><div style={styles.errorBox}>Error: {error}</div></div>;

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* HEADER */}
        <div style={styles.header}>
          <div style={{ minWidth: 0 }}>
            <h1 style={styles.title}>Terminal de Análisis: {ticker || "---"}</h1>
            <p style={styles.subtitle}>
              {isChile ? "Mercado Chileno 🇨🇱" : "Mercado Internacional 🌎"} | v3.5
            </p>
          </div>

          <div style={styles.selectorWrap}>
            <label style={styles.selectorLabel}>Activo</label>
            <select value={ticker} onChange={handleTickerChange} style={styles.select}>
              <option value="">Seleccionar activo</option>
              {tickers.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {loading && <div style={styles.loadingBox}>Cargando análisis...</div>}
        {!ticker && !loading && <div style={styles.emptyBox}>Selecciona un ticker para ver el análisis.</div>}

        {data.prediction && !loading && (
          <div style={styles.contentGrid}>

            {/* KPIs */}
            <div style={styles.kpiGrid}>
              <BloqueResumen   prediction={data.prediction} isChile={isChile} />
              <BloqueAlphaScore alphaData={data.alpha} />
              <BloqueRobustez  historical={data.historical} />
              <BloqueEnsemble  fullLatest={data.full_latest} />
            </div>

            {/* Charts superiores */}
            <div style={styles.chartGrid}>
              <ChartBacktest         data={chartDataHistorical} />
              <ChartModelDiagnostics data={chartDataModels} />
            </div>

            {/* Forecast Cone */}
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

const ChartBacktest = ({ data }) => (
  <div style={styles.card}>
    <div style={styles.cardTitle}>Backtest Real vs Predicho</div>
    <div style={styles.chartWrap}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.07)" />
          <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 12 }} />
          <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} unit="%" />
          <Tooltip contentStyle={styles.tooltip} formatter={(v) => [`${v}%`, ""]} />
          <Legend />
          <ReferenceLine y={0} stroke="#64748b" />
          <Line type="monotone" dataKey="real" name="Real"     stroke="#38bdf8" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          <Line type="monotone" dataKey="pred" name="Predicho" stroke="#fbbf24" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 3 }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>
);

// Model Diagnostics — muestra pred_return de cada H como barras
// Si real_return existe (post-evaluación), lo superpone como línea
const ChartModelDiagnostics = ({ data }) => {
  const hasReal = data.some((d) => d.real != null);

  return (
    <div style={styles.card}>
      <div style={styles.cardTitle}>Model Diagnostics H1–H10</div>
      <div style={styles.chartWrap}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.07)" />
            <XAxis dataKey="model" stroke="#94a3b8" tick={{ fontSize: 12 }} />
            <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} unit="%" />
            <Tooltip contentStyle={styles.tooltip} formatter={(v) => [`${v}%`, ""]} />
            <Legend />
            <ReferenceLine y={0} stroke="#64748b" />
            <Bar dataKey="pred" name="Retorno Predicho %" fill="#38bdf8" radius={[6, 6, 0, 0]} />
            {hasReal && (
              <Bar dataKey="real" name="Retorno Real %" fill="#22c55e" radius={[6, 6, 0, 0]} />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Forecast Cone corregido — bandas usando pares l/u con Area apilada correcta
const ChartForecastCone = ({ data, priceNow, isChile }) => {
  const fmt = (v) =>
    isChile ? `$${Math.round(v).toLocaleString("es-CL")}` : `$${Number(v).toFixed(2)}`;

  return (
    <div style={styles.card}>
      <div style={{ ...styles.cardTitle, color: "#fbbf24" }}>Forecast Cone (H1–H9)</div>
      <div style={{ ...styles.chartWrap, height: 360 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.07)" />
            <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 12 }} />
            <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} tickFormatter={fmt} />
            <Tooltip contentStyle={styles.tooltip} formatter={(v) => [fmt(v), ""]} />
            <Legend />
            {priceNow && (
              <ReferenceLine
                y={priceNow}
                stroke="#64748b"
                strokeDasharray="4 4"
                label={{ value: "Precio actual", fill: "#94a3b8", fontSize: 11 }}
              />
            )}

            {/* Banda 90% — más externa, más transparente */}
            <Area type="monotone" dataKey="u90" name="Banda 90%" stroke="none" fill="#f59e0b" fillOpacity={0.06} legendType="none" />
            <Area type="monotone" dataKey="l90" name=" "         stroke="none" fill="#06101f"  fillOpacity={1}    legendType="none" />

            {/* Banda 70% */}
            <Area type="monotone" dataKey="u70" name="Banda 70%" stroke="none" fill="#f59e0b" fillOpacity={0.12} legendType="none" />
            <Area type="monotone" dataKey="l70" name=" "         stroke="none" fill="#06101f"  fillOpacity={1}    legendType="none" />

            {/* Banda 50% — más interna, más visible */}
            <Area type="monotone" dataKey="u50" name="Banda 50%" stroke="none" fill="#f59e0b" fillOpacity={0.22} legendType="none" />
            <Area type="monotone" dataKey="l50" name=" "         stroke="none" fill="#06101f"  fillOpacity={1}    legendType="none" />

            {/* Trayectoria central */}
            <Line type="monotone" dataKey="price" name="Trayectoria esperada" stroke="#fbbf24" strokeWidth={3} dot={{ r: 2 }} activeDot={{ r: 5 }} />
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
  // ← corregido: "VENTA" y "VENDE" ambos funcionan
  const rec = prediction.recommendation || "HOLD";
  const color =
    rec === "COMPRA"               ? "#22c55e" :
    rec === "VENTA" || rec === "VENDE" ? "#ef4444" :
    "#eab308";

  return (
    <div style={{ ...styles.card, borderLeft: `6px solid ${color}` }}>
      <div style={styles.kpiLabel}>RECOMENDACIÓN</div>
      <div style={{ ...styles.kpiBig, color }}>{rec}</div>
      <div style={styles.kpiSub}>Target {formatPct(prediction.ret_ens_pct)}</div>
      <div style={styles.kpiSub}>Precio Obj {formatMoney(prediction.price_pred, isChile)}</div>
      <div style={styles.kpiSub}>Precio Actual {formatMoney(prediction.price_now, isChile)}</div>
    </div>
  );
}

function BloqueAlphaScore({ alphaData }) {
  const score = Number(alphaData?.alpha_score ?? 0);
  const color = score > 0 ? "#22c55e" : score < 0 ? "#ef4444" : "#94a3b8";
  return (
    <div style={{ ...styles.card, textAlign: "center" }}>
      <div style={styles.kpiLabel}>ALPHA SCORE</div>
      <div style={{ ...styles.kpiBig, color }}>{score.toFixed(3)}</div>
    </div>
  );
}

function BloqueRobustez({ historical }) {
  const hit  = Number((historical?.hit_rate_mean ?? 0) * 100);
  const color = hit >= 55 ? "#22c55e" : hit >= 45 ? "#eab308" : "#ef4444";
  return (
    <div style={styles.card}>
      <div style={styles.kpiLabel}>HIT RATE</div>
      <div style={{ ...styles.kpiBig, color }}>{hit.toFixed(1)}%</div>
    </div>
  );
}

// ← NUEVO: muestra cuántos modelos H contribuyeron al ensemble
function BloqueEnsemble({ fullLatest }) {
  const total    = fullLatest?.ensemble_models ?? 0;
  const models   = fullLatest?.models_diagnostics ?? {};
  const count    = Object.keys(models).length;
  const color    = count >= 8 ? "#22c55e" : count >= 5 ? "#eab308" : "#ef4444";

  return (
    <div style={styles.card}>
      <div style={styles.kpiLabel}>MODELOS ENSEMBLE</div>
      <div style={{ ...styles.kpiBig, color }}>{total}</div>
      <div style={styles.kpiSub}>{count} con diagnóstico</div>
    </div>
  );
}

/* =======================================================
   HELPERS
   ======================================================= */

function formatMoney(v, isChile) {
  if (v == null) return "—";
  return isChile
    ? "$" + Math.round(v).toLocaleString("es-CL")
    : "$" + Number(v).toFixed(2);
}

function formatPct(v) {
  if (v == null) return "—";
  return `${v > 0 ? "+" : ""}${Number(v).toFixed(2)}%`;
}

/* =======================================================
   STYLES
   ======================================================= */

const styles = {
  page: {
    minHeight: "100vh",
    background: "radial-gradient(circle at top, rgba(14,165,233,0.10), transparent 30%), linear-gradient(180deg, #06101f 0%, #081427 45%, #09192e 100%)",
    color: "#f8fafc",
    padding: "18px 14px 28px"
  },
  container:   { width: "100%", maxWidth: 1400, margin: "0 auto" },
  header:      { display: "grid", gridTemplateColumns: "1fr auto", alignItems: "start", gap: 16, marginBottom: 22 },
  title:       { margin: 0, fontSize: "clamp(2rem, 5vw, 3.4rem)", lineHeight: 1.02, fontWeight: 800, letterSpacing: "-0.03em" },
  subtitle:    { marginTop: 10, marginBottom: 0, color: "#94a3b8", fontSize: "1rem" },
  selectorWrap:{ display: "flex", flexDirection: "column", gap: 8, width: "100%", maxWidth: 320 },
  selectorLabel:{ color: "#94a3b8", fontSize: 13, fontWeight: 700, letterSpacing: "0.08em" },
  select:      { width: "100%", height: 48, borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", background: "#162338", color: "#f8fafc", padding: "0 14px", fontSize: 16, outline: "none", boxShadow: "0 8px 24px rgba(0,0,0,0.25)" },
  loadingBox:  { padding: 18, borderRadius: 16, background: "rgba(30,41,59,0.85)", color: "#fbbf24", border: "1px solid rgba(255,255,255,0.06)" },
  emptyBox:    { padding: 22, borderRadius: 16, background: "rgba(30,41,59,0.85)", color: "#cbd5e1", border: "1px solid rgba(255,255,255,0.06)" },
  errorBox:    { padding: 18, borderRadius: 16, background: "#3b0d0d", color: "#fecaca", border: "1px solid rgba(255,255,255,0.08)" },
  contentGrid: { display: "grid", gap: 20 },
  kpiGrid:     { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 },
  chartGrid:   { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 },
  card:        { background: "linear-gradient(180deg, rgba(24,35,56,0.96) 0%, rgba(18,28,46,0.96) 100%)", borderRadius: 22, padding: 22, border: "1px solid rgba(255,255,255,0.06)", boxShadow: "0 14px 36px rgba(0,0,0,0.28)" },
  cardTitle:   { fontSize: 18, fontWeight: 800, marginBottom: 14, color: "#f8fafc" },
  chartWrap:   { width: "100%", height: 320 },
  kpiLabel:    { color: "#94a3b8", fontSize: 14, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 10 },
  kpiBig:      { fontSize: "clamp(2rem, 5vw, 3.2rem)", fontWeight: 800, lineHeight: 1 },
  kpiSub:      { marginTop: 10, color: "#e2e8f0", fontSize: 18 },
  tooltip:     { background: "#0f172a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, color: "#fff" }
};
