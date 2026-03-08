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
  Area
} from "recharts";

const API = import.meta.env.VITE_API_URL;

// Custom hook para data fetching
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
      setError(null);
      return;
    }

    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [resLatest, resAlpha] = await Promise.all([
          fetch(`${apiUrl}/dashboard/latest/${ticker}`),
          fetch(`${apiUrl}/alpha`)
        ]);

        if (!resLatest.ok) {
          throw new Error(`Error ${resLatest.status}: ${resLatest.statusText}`);
        }
        if (!resAlpha.ok) {
          throw new Error(`Error ${resAlpha.status}: ${resAlpha.statusText}`);
        }

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
        setError(err.message);
        console.error("Error cargando análisis:", err);
        setData({ meta: null, prediction: null, historical: null, alpha: null, full_latest: null });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [ticker, apiUrl]);

  return { data, loading, error };
};

// Skeleton loading component
const SkeletonLoader = () => (
  <div style={{ display: "grid", gap: "20px" }}>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 0.7fr 0.8fr", gap: "20px" }}>
      {[...Array(3)].map((_, i) => (
        <div key={i} style={{ 
          height: "180px", 
          background: "#1e293b", 
          borderRadius: 12, 
          border: "1px solid #334155",
          animation: "pulse 1.5s ease-in-out infinite",
          background: "linear-gradient(90deg, #1e293b 25%, #334155 50%, #1e293b 75%)",
          backgroundSize: "200% 100%",
        }} />
      ))}
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
      {[...Array(2)].map((_, i) => (
        <div key={i} style={{ 
          height: "380px", 
          background: "#1e293b", 
          borderRadius: 12, 
          border: "1px solid #334155",
          animation: "pulse 1.5s ease-in-out infinite",
          background: "linear-gradient(90deg, #1e293b 25%, #334155 50%, #1e293b 75%)",
          backgroundSize: "200% 100%",
        }} />
      ))}
    </div>
  </div>
);

// Error component
const ErrorView = ({ error, onRetry }) => (
  <div style={{ 
    padding: 30, 
    background: "#1e293b", 
    borderRadius: 12, 
    border: "1px solid #ef4444",
    color: "#fca5a5",
    textAlign: "center",
    maxWidth: "600px",
    margin: "0 auto"
  }}>
    <h3 style={{ color: "#ef4444", margin: "0 0 15px 0" }}>Error de Conexión</h3>
    <p>{error}</p>
    <button 
      onClick={onRetry}
      style={{
        marginTop: 15,
        padding: "12px 24px",
        background: "#ef4444",
        color: "white",
        border: "none",
        borderRadius: 8,
        cursor: "pointer",
        fontWeight: 600
      }}
    >
      Reintentar
    </button>
  </div>
);

export default function Analysis() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryTicker = searchParams.get("ticker");
  const [ticker, setTicker] = useState(queryTicker || "");
  const [tickers, setTickers] = useState([]);

  // Custom hooks
  const { data, loading, error } = useAnalysisData(ticker, API);

  // Cargar tickers disponibles
  useEffect(() => {
    fetch(`${API}/dashboard/tickers`)
      .then(r => {
        if (!r.ok) throw new Error('Error cargando tickers');
        return r.json();
      })
      .then(j => setTickers(j?.tickers || []))
      .catch(e => console.error('Error tickers:', e));
  }, []);

  // Sincronizar URL
  useEffect(() => {
    if (ticker) {
      setSearchParams({ ticker }, { replace: true });
    }
  }, [ticker, setSearchParams]);

  // Preparación optimizada de datos para charts
  const chartDataHistorical = useMemo(() => {
    if (!data.historical?.windows) return [];
    return data.historical.windows.map((w, index) => ({
      name: `W${index + 1}`,
      real: Number((w.ret_real * 100).toFixed(2)),
      pred: Number((w.ret_pred * 100).toFixed(2))
    }));
  }, [data.historical]);

  const chartDataFuture = useMemo(() => {
    if (!data.prediction || !data.full_latest) return [];

    const priceNow = data.prediction.price_now;
    const curve = data.full_latest.price_curve;
    const hitRate = data.historical?.hit_rate_mean ?? 0.5;

    const rows = [{
      day: 0,
      label: "Hoy",
      price: priceNow,
      u50: priceNow, l50: priceNow,
      u70: priceNow, l70: priceNow,
      u90: priceNow, l90: priceNow
    }];

    if (curve?.price_path) {
      curve.price_path.forEach((p, i) => {
        const day = i + 1;
        const baseVol = p * (1 - hitRate) * 0.04 * Math.min(day / 10, 1);
        rows.push({
          day,
          label: `T+${day}`,
          price: p,
          u50: p + baseVol * 0.6,
          l50: p - baseVol * 0.6,
          u70: p + baseVol * 1.0,
          l70: p - baseVol * 1.0,
          u90: p + baseVol * 1.6,
          l90: p - baseVol * 1.6
        });
      });
    }

    return rows;
  }, [data.prediction, data.full_latest, data.historical]);

  const isChile = ticker.endsWith(".SN") || ticker.endsWith(".CL");

  const handleTickerChange = useCallback((e) => {
    setTicker(e.target.value);
  }, []);

  // Estados de carga
  if (error && !loading) {
    return (
      <div style={{ padding: "20px", background: "#0f172a", minHeight: "100vh", color: "white", fontFamily: "system-ui" }}>
        <ErrorView error={error} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", background: "#0f172a", minHeight: "100vh", color: "white", fontFamily: "system-ui" }}>
      <style>{`
        @keyframes pulse {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 25, alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.8rem" }}>Terminal de Análisis: {ticker || "---"}</h1>
          <p style={{ color: "#94a3b8", margin: "5px 0" }}>
            {isChile ? "Mercado Chileno 🇨🇱" : "Mercado Internacional 🌎"} | Predictivo v3.1
          </p>
        </div>

        <select
          value={ticker}
          onChange={handleTickerChange}
          disabled={loading}
          style={{ 
            padding: "10px 15px", 
            borderRadius: 8, 
            background: loading ? "#334155" : "#1e293b", 
            color: "white", 
            border: "1px solid #334155", 
            cursor: loading ? "not-allowed" : "pointer",
            minWidth: "200px"
          }}
        >
          <option value="">Seleccionar activo</option>
          {tickers.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {loading && !data.prediction ? (
        <SkeletonLoader />
      ) : data.prediction ? (
        <div style={{ display: "grid", gap: "20px" }}>
          {/* KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 0.7fr 0.8fr", gap: "20px" }}>
            <BloqueResumen prediction={data.prediction} isChile={isChile} />
            <BloqueAlphaScore alphaData={data.alpha} />
            <BloqueRobustez historical={data.historical} />
          </div>

          {/* CHARTS */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <ChartBacktest data={chartDataHistorical} />
            <ChartForecastCone data={chartDataFuture} prediction={data.prediction} isChile={isChile} />
          </div>
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>
          Selecciona un activo para comenzar el análisis
        </div>
      )}
    </div>
  );
}

// Componentes optimizados con React.memo
const BloqueResumen = React.memo(({ prediction, isChile }) => {
  const color = prediction.recommendation === "COMPRA" ? "#22c55e" : 
                prediction.recommendation === "VENTA" ? "#ef4444" : "#eab308";
  
  return (
    <div style={{ padding: 20, background: "#1e293b", borderRadius: 12, borderLeft: `6px solid ${color}`, borderTop: "1px solid #334155" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 15 }}>
        <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>RECOMENDACIÓN</span>
        <strong style={{ color, fontSize: "1.2rem" }}>{prediction.recommendation}</strong>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15 }}>
        <Metric label="Retorno Obj." value={formatPct(prediction.ret_ens_pct)} color={color} />
        <Metric label="Precio Obj." value={formatMoney(prediction.price_pred, isChile)} />
        <Metric label="Precio Actual" value={formatMoney(prediction.price_now, isChile)} />
      </div>
    </div>
  );
});

const BloqueAlphaScore = React.memo(({ alphaData }) => {
  const score = alphaData?.alpha_score ?? 0;
  const color = score >= 0.65 ? "#22c55e" : score >= 0.5 ? "#eab308" : "#ef4444";
  
  return (
    <div style={{ padding: 20, background: "#1e293b", borderRadius: 12, textAlign: "center", border: "1px solid #334155" }}>
      <div style={{ color: "#94a3b8", fontSize: "0.8rem", marginBottom: 10 }}>ALPHA SCORE</div>
      <div style={{ fontSize: "2.5rem", fontWeight: 900, color }}>{score.toFixed(3)}</div>
      <div style={{ height: 4, background: "#0f172a", borderRadius: 2, marginTop: 10 }}>
        <div style={{ width: `${Math.min(score * 100, 100)}%`, height: "100%", background: color, borderRadius: 2 }} />
      </div>
    </div>
  );
});

const BloqueRobustez = React.memo(({ historical }) => {
  const hit = (historical?.hit_rate_mean ?? 0) * 100;
  return (
    <div style={{ padding: 20, background: "#1e293b", borderRadius: 12, border: "1px solid #334155" }}>
      <div style={{ color: "#94a3b8", fontSize: "0.8rem", marginBottom: 10 }}>ROBUSTEZ MODELO</div>
      <Metric label="Hit Rate" value={`${hit.toFixed(1)}%`} color={hit > 50 ? "#22c55e" : "#ef4444"} />
      <div style={{ fontSize: "0.7rem", color: "#64748b", marginTop: 5 }}>
        Basado en {historical?.n_windows || 0} ventanas
      </div>
    </div>
  );
});

const ChartBacktest = React.memo(({ data }) => (
  <div style={{ background: "#1e293b", padding: 20, borderRadius: 12, border: "1px solid #334155" }}>
    <h2 style={{ fontSize: "1.1rem", marginBottom: 15 }}>Backtest: Real vs Predicho</h2>
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
        <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
        <YAxis stroke="#94a3b8" fontSize={12} unit="%" />
        <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155" }} />
        <Legend />
        <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
        <Line name="Real" dataKey="real" stroke="#38bdf8" strokeWidth={3} dot={false} />
        <Line name="Predicho" dataKey="pred" stroke="#fbbf24" strokeWidth={3} strokeDasharray="5 5" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  </div>
));

const ChartForecastCone = React.memo(({ data, prediction, isChile }) => (
  <div style={{ background: "#1e293b", padding: 20, borderRadius: 12, border: "1px solid #334155" }}>
    <h2 style={{ fontSize: "1.1rem", marginBottom: 15, color: "#fbbf24" }}>Forecast Cone (Goldman Style)</h2>
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
        
        <Area dataKey="u90" stroke="none" fill="#fbbf24" fillOpacity={0.05} baseLine={d => d.l90} />
        <Area dataKey="u70" stroke="none" fill="#fbbf24" fillOpacity={0.10} baseLine={d => d.l70} />
        <Area dataKey="u50" stroke="none" fill="#fbbf24" fillOpacity={0.18} baseLine={d => d.l50} />
        <Area name="Precio Predicho" dataKey="price" stroke="#fbbf24" strokeWidth={3} fill="none" dot={false} />
        <ReferenceLine y={prediction.price_now} stroke="#475569" strokeDasharray="3 3" label={{ position: 'left', fill: '#94a3b8', value: 'Hoy', fontSize: 10 }} />
      </AreaChart>
    </ResponsiveContainer>
  </div>
));

const Metric = React.memo(({ label, value, color }) => (
  <div style={{ marginBottom: 8 }}>
    <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase" }}>{label}</div>
    <div style={{ fontWeight: 700, fontSize: "1.1rem", color: color || "white" }}>{value}</div>
  </div>
));

function formatMoney(v, isChile) {
  if (v == null) return "—";
  return isChile 
    ? "$" + Math.round(v).toLocaleString("es-CL") 
    : "$" + Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPct(v) {
  if (v == null) return "—";
  return (v > 0 ? "+" : "") + Number(v).toFixed(2) + "%";
}
