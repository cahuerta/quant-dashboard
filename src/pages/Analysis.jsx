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

// ---------------------------------------------------------
// CUSTOM HOOK: Gestión de Datos con Abstracción
// ---------------------------------------------------------
const useAnalysisData = (ticker, apiUrl) => {
  const [data, setData] = useState({
    meta: null,
    prediction: null,
    historical: null,
    alpha: null,
    full_latest: null
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ticker) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const [resLatest, resAlpha] = await Promise.all([
          fetch(`${apiUrl}/dashboard/latest/${ticker}`),
          fetch(`${apiUrl}/alpha`)
        ]);

        const [jsonLatest, jsonAlpha] = await Promise.all([
          resLatest.json(),
          resAlpha.json()
        ]);

        const last = jsonLatest?.latest;

        setData({
          meta: last?.meta || null,
          prediction: last?.prediction || null,
          historical: last?.historical || null,
          alpha: jsonAlpha?.results?.[ticker] || null,
          full_latest: last || null
        });
      } catch (err) {
        console.error("Error fetching analysis:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [ticker, apiUrl]);

  return { data, loading };
};

// ---------------------------------------------------------
// COMPONENTE PRINCIPAL: TERMINAL DE ANÁLISIS
// ---------------------------------------------------------
export default function Analysis() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryTicker = searchParams.get("ticker");

  const [ticker, setTicker] = useState(queryTicker || "");
  const [tickers, setTickers] = useState([]);

  const { data, loading } = useAnalysisData(ticker, API);

  useEffect(() => {
    fetch(`${API}/dashboard/tickers`)
      .then(r => r.json())
      .then(j => setTickers(j?.tickers || []));
  }, []);

  useEffect(() => {
    if (ticker) setSearchParams({ ticker }, { replace: true });
  }, [ticker, setSearchParams]);

  // Transformación para el gráfico de Cono (Goldman Style)
  const chartDataFuture = useMemo(() => {
    if (!data.prediction || !data.full_latest) return [];

    const priceNow = data.prediction.price_now;
    const curve = data.full_latest.price_curve;
    const hitRate = data.historical?.hit_rate_mean ?? 0.5;

    const rows = [{
      day: 0,
      label: "Hoy",
      price: priceNow,
      u90: priceNow, l90: priceNow,
      u50: priceNow, l50: priceNow
    }];

    curve?.price_path?.forEach((p, i) => {
      const day = i + 1;
      const baseVol = p * (1 - hitRate) * 0.04 * (day / 10);
      rows.push({
        day,
        label: `T+${day}`,
        price: p,
        u90: p + baseVol * 1.6,
        l90: p - baseVol * 1.6,
        u50: p + baseVol * 0.6,
        l50: p - baseVol * 0.6
      });
    });

    return rows;
  }, [data.prediction, data.full_latest, data.historical]);

  // Transformación para el diagnóstico de modelos (H1-H10)
  const chartDataModels = useMemo(() => {
    const models = data.full_latest?.models_diagnostics;
    if (!models) return [];

    return Object.entries(models).map(([model, v]) => ({
      model,
      error: Number(v.error_pct?.toFixed(2)),
      pred: Number(v.pred_return?.toFixed(2)),
      real: Number(v.real_return?.toFixed(2))
    }));
  }, [data.full_latest]);

  const isChile = ticker.endsWith(".SN") || ticker.endsWith(".CL");

  const handleTickerChange = useCallback((e) => {
    setTicker(e.target.value);
  }, []);

  return (
    <div style={{ padding: 20, background: "#0f172a", minHeight: "100vh", color: "white", fontFamily: "system-ui" }}>
      
      {/* HEADER SECTION */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 25, alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.8rem" }}>Terminal de Análisis: {ticker || "---"}</h1>
          <p style={{ color: "#94a3b8", margin: "5px 0" }}>
            {isChile ? "Mercado Chileno 🇨🇱" : "Mercado Internacional 🌎"} | v3.2 Stable
          </p>
        </div>

        <select 
          value={ticker} 
          onChange={handleTickerChange}
          style={{ padding: "10px 15px", borderRadius: 8, background: "#1e293b", color: "white", border: "1px solid #334155" }}
        >
          <option value="">Seleccionar activo</option>
          {tickers.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {loading && <div style={{ color: "#fbbf24", marginBottom: 20 }}>Sincronizando modelos...</div>}

      {data.prediction && !loading && (
        <div style={{ display: "grid", gap: 20 }}>
          
          {/* KPI ROW */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 0.7fr 0.8fr", gap: 20 }}>
            <BloqueResumen prediction={data.prediction} isChile={isChile} />
            <BloqueAlphaScore alphaData={data.alpha} />
            <BloqueRobustez historical={data.historical} />
          </div>

          {/* CHARTS ROW */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <ChartModelDiagnostics data={chartDataModels} />
            <ChartForecastCone data={chartDataFuture} prediction={data.prediction} isChile={isChile} />
          </div>

        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------
// SUB-COMPONENTES (Visualización)
// ---------------------------------------------------------

const ChartModelDiagnostics = React.memo(({ data }) => (
  <div style={{ background: "#1e293b", padding: 20, borderRadius: 12, border: "1px solid #334155" }}>
    <h2 style={{ fontSize: "1.1rem", marginBottom: 15 }}>Diagnóstico de Modelos (Error H1-H10)</h2>
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
        <XAxis dataKey="model" stroke="#94a3b8" />
        <YAxis stroke="#94a3b8" unit="%" fontSize={12} />
        <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155" }} />
        <Legend />
        <Bar dataKey="error" name="Error Abs. %" fill="#ef4444" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  </div>
));

const ChartForecastCone = React.memo(({ data, prediction, isChile }) => (
  <div style={{ background: "#1e293b", padding: 20, borderRadius: 12, border: "1px solid #334155" }}>
    <h2 style={{ fontSize: "1.1rem", marginBottom: 15, color: "#fbbf24" }}>Forecast Cone (Confidence Bands)</h2>
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
        <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} />
        <YAxis 
          stroke="#94a3b8" 
          fontSize={12} 
          domain={['auto', 'auto']}
          tickFormatter={(v) => isChile ? `$${Math.round(v).toLocaleString("es-CL")}` : `$${v.toFixed(2)}`}
        />
        <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155" }} />
        
        {/* Capas de Probabilidad */}
        <Area dataKey="u90" stroke="none" fill="#fbbf24" fillOpacity={0.05} baseLine={d => d.l90} />
        <Area dataKey="u50" stroke="none" fill="#fbbf24" fillOpacity={0.15} baseLine={d => d.l50} />

        {/* Línea Principal */}
        <Line type="monotone" dataKey="price" stroke="#fbbf24" strokeWidth={3} dot={false} />
        
        <ReferenceLine y={prediction.price_now} stroke="#64748b" strokeDasharray="3 3" label={{ value: 'Actual', position: 'left', fill: '#94a3b8', fontSize: 10 }} />
      </AreaChart>
    </ResponsiveContainer>
  </div>
));

// KPI UI Elements
function BloqueResumen({ prediction, isChile }) {
  const color = prediction.recommendation === "COMPRA" ? "#22c55e" : prediction.recommendation === "VENTA" ? "#ef4444" : "#eab308";
  return (
    <div style={{ padding: 20, background: "#1e293b", borderRadius: 12, borderLeft: `6px solid ${color}` }}>
      <div style={{ color: "#94a3b8", fontSize: "0.8rem", marginBottom: 5 }}>RECOMENDACIÓN</div>
      <div style={{ fontSize: "1.5rem", fontWeight: "bold", color, marginBottom: 15 }}>{prediction.recommendation}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Metric label="Target" value={formatPct(prediction.ret_ens_pct)} color={color} />
        <Metric label="Precio Obj." value={formatMoney(prediction.price_pred, isChile)} />
      </div>
    </div>
  );
}

function BloqueAlphaScore({ alphaData }) {
  const score = alphaData?.alpha_score ?? 0;
  return (
    <div style={{ padding: 20, background: "#1e293b", borderRadius: 12, textAlign: "center" }}>
      <div style={{ color: "#94a3b8", fontSize: "0.8rem" }}>ALPHA SCORE</div>
      <div style={{ fontSize: "2.5rem", fontWeight: 900, color: score > 0.5 ? "#22c55e" : "#ef4444" }}>{score.toFixed(3)}</div>
    </div>
  );
}

function BloqueRobustez({ historical }) {
  const hit = (historical?.hit_rate_mean ?? 0) * 100;
  return (
    <div style={{ padding: 20, background: "#1e293b", borderRadius: 12 }}>
      <div style={{ color: "#94a3b8", fontSize: "0.8rem" }}>HIT RATE (MODELO)</div>
      <div style={{ fontSize: "1.8rem", fontWeight: "bold", color: hit > 50 ? "#22c55e" : "#94a3b8" }}>{hit.toFixed(1)}%</div>
      <div style={{ fontSize: "0.7rem", color: "#64748b" }}>n={historical?.n_windows} ventanas</div>
    </div>
  );
}

function Metric({ label, value, color }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontWeight: "bold", color: color || "white" }}>{value}</div>
    </div>
  );
}

function formatMoney(v, isChile) {
  if (v == null) return "—";
  return isChile ? "$" + Math.round(v).toLocaleString("es-CL") : "$" + Number(v).toFixed(2);
}

function formatPct(v) {
  if (v == null) return "—";
  return (v > 0 ? "+" : "") + Number(v).toFixed(2) + "%";
}
