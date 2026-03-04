import React, { useEffect, useState, useMemo } from "react";
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

export default function Analysis() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryTicker = searchParams.get("ticker");

  const [ticker, setTicker] = useState(queryTicker || "");
  const [tickers, setTickers] = useState([]);
  const [data, setData] = useState({
    meta: null,
    prediction: null,
    historical: null,
    alpha: null,
  });
  const [loading, setLoading] = useState(false);

  // 1. Cargar lista de tickers disponibles
  useEffect(() => {
    fetch(`${API}/dashboard/tickers`)
      .then((res) => res.json())
      .then((json) => setTickers(json?.tickers || []));
  }, []);

  // 2. Cargar datos profundos del activo seleccionado
  useEffect(() => {
    if (!ticker) return;
    setSearchParams({ ticker });

    async function loadData() {
      setLoading(true);
      try {
        const [resLatest, resAlpha] = await Promise.all([
          fetch(`${API}/dashboard/latest/${ticker}`),
          fetch(`${API}/alpha`),
        ]);

        const jsonLatest = await resLatest.json();
        const jsonAlpha = await resAlpha.json();
        const last = jsonLatest?.latest;

        setData({
          meta: last?.meta || null,
          prediction: last?.prediction || null,
          historical: last?.historical || null,
          alpha: jsonAlpha?.results?.[ticker] || null,
        });
      } catch (e) {
        console.error("Error cargando análisis:", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [ticker, setSearchParams]);

  // 3. Preparación de datos para Gráfico A: Validación (Histórico)
  const chartDataHistorical = useMemo(() => {
    if (!data.historical?.windows) return [];
    return data.historical.windows.map((w, index) => ({
      name: `W${index + 1}`,
      real: (w.ret_real * 100).toFixed(2),
      pred: (w.ret_pred * 100).toFixed(2),
    }));
  }, [data.historical]);

  // 4. Preparación de datos para Gráfico B: Proyección (Futuro)
  const chartDataFuture = useMemo(() => {
    if (!data.prediction) return [];
    const { price_now, price_pred } = data.prediction;
    const horizon = data.meta?.horizon_days || 10;

    return [
      { day: "Hoy", price: price_now },
      { day: `T+${horizon}d`, price: price_pred },
    ];
  }, [data.prediction, data.meta]);

  // Helper: Detección de mercado chileno
  const isChile = ticker.endsWith(".SN") || ticker.endsWith(".CL");

  return (
    <div className="global-container">
      {/* HEADER SECTION */}
      <div className="global-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "25px" }}>
        <div>
          <h1 style={{ margin: 0 }}>Terminal de Análisis: {ticker || "---"}</h1>
          <p style={{ color: "#94a3b8", margin: "5px 0" }}>
            {isChile ? "Mercado Local Chileno 🇨🇱" : "Mercado Internacional 🌎"} | Predictivo v3.0
          </p>
        </div>

        <select
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          className="selector"
          style={{ padding: "10px 15px", borderRadius: "8px", backgroundColor: "#1e293b", color: "white", border: "1px solid #334155" }}
        >
          <option value="">Seleccionar Activo...</option>
          {tickers.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {loading && <div className="global-loading">Sincronizando modelos neuronales...</div>}

      {!loading && data.prediction && (
        <div style={{ display: "grid", gap: "20px" }}>
          
          {/* FILA 1: KPIs CLAVE */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 0.7fr 0.8fr", gap: "20px" }}>
            <BloqueResumen prediction={data.prediction} isChile={isChile} />
            <BloqueAlphaScore alphaData={data.alpha} />
            <BloqueRobustez historical={data.historical} />
          </div>

          {/* FILA 2: GRÁFICOS (PASADO VS FUTURO) */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            
            {/* Gráfico de Validación (Mide qué tan bien ha funcionado el modelo) */}
            <div className="card" style={{ height: "350px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                <h2 style={{ fontSize: "1rem" }}>Backtest: Real vs. Predicho</h2>
                <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>Retorno por ventana %</span>
              </div>
              <ResponsiveContainer width="100%" height="85%">
                <LineChart data={chartDataHistorical}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} unit="%" />
                  <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "none", borderRadius: "8px" }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: "12px" }} />
                  <ReferenceLine y={0} stroke="#475569" />
                  <Line name="Real" type="monotone" dataKey="real" stroke="#38bdf8" strokeWidth={2} dot={false} />
                  <Line name="Modelo" type="monotone" dataKey="pred" stroke="#fbbf24" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Gráfico de Proyección (Muestra el objetivo visual) */}
            <div className="card" style={{ height: "350px", background: "linear-gradient(145deg, #1e293b, #0f172a)" }}>
              <h2 style={{ fontSize: "1rem", color: "#fbbf24" }}>Proyección: Horizonte {data.meta?.horizon_days}d</h2>
              <ResponsiveContainer width="100%" height="85%">
                <AreaChart data={chartDataFuture}>
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} />
                  <YAxis 
                    domain={["auto", "auto"]} 
                    stroke="#94a3b8" 
                    fontSize={10} 
                    tickFormatter={(v) => isChile ? `$${Math.round(v).toLocaleString("es-CL")}` : `$${v}`}
                  />
                  <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "none" }} />
                  <Area type="monotone" dataKey="price" name="Precio" stroke="#fbbf24" fillOpacity={1} fill="url(#colorPrice)" strokeWidth={3} dot={{ r: 6, fill: "#fbbf24" }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* FILA 3: DETALLES TÉCNICOS */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <BloqueAlphaDetalle alphaData={data.alpha} />
            <BloqueConfiguracion meta={data.meta} />
          </div>
        </div>
      )}
    </div>
  );
}

// --- SUB-COMPONENTES AUXILIARES ---

function BloqueResumen({ prediction, isChile }) {
  const isBuy = prediction.recommendation === "COMPRA";
  const color = isBuy ? "#22c55e" : prediction.recommendation === "VENTA" ? "#ef4444" : "#eab308";

  return (
    <div className="card" style={{ borderLeft: `6px solid ${color}` }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h2 style={{ fontSize: "0.9rem", color: "#94a3b8" }}>RECOMENDACIÓN</h2>
        <span style={{ fontWeight: "900", color: color }}>{prediction.recommendation}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "15px" }}>
        <Metric label="Retorno Obj." value={formatPct(prediction.ret_ens_pct)} color={color} strong />
        <Metric label="Precio Obj." value={formatMoney(prediction.price_pred, isChile)} strong />
        <Metric label="Precio Actual" value={formatMoney(prediction.price_now, isChile)} />
      </div>
    </div>
  );
}

function BloqueAlphaScore({ alphaData }) {
  const score = alphaData?.alpha_score ?? 0;
  const color = score >= 0.65 ? "#22c55e" : score >= 0.5 ? "#eab308" : "#ef4444";
  return (
    <div className="card" style={{ textAlign: "center" }}>
      <h2 style={{ fontSize: "0.8rem", color: "#94a3b8" }}>ALPHA SCORE</h2>
      <div style={{ fontSize: "2.5rem", fontWeight: "900", color: color, margin: "5px 0" }}>
        {score.toFixed(3)}
      </div>
      <div style={{ height: "6px", background: "#334155", borderRadius: "3px" }}>
        <div style={{ width: `${score * 100}%`, height: "100%", background: color, borderRadius: "3px" }} />
      </div>
    </div>
  );
}

function BloqueRobustez({ historical }) {
  const hit = (historical?.hit_rate_mean ?? 0) * 100;
  return (
    <div className="card">
      <h2 style={{ fontSize: "0.8rem", color: "#94a3b8" }}>ROBUSTEZ (BACKTEST)</h2>
      <div style={{ marginTop: "10px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "5px" }}>
          <span>Ventanas calculadas:</span>
          <span style={{ fontWeight: "bold" }}>{historical?.n_windows}</span>
        </div>
        <Metric label="Hit Rate Total" value={`${hit.toFixed(1)}%`} color={hit > 50 ? "#22c55e" : "#ef4444"} strong />
      </div>
    </div>
  );
}

function BloqueAlphaDetalle({ alphaData }) {
  const c = alphaData?.components || {};
  return (
    <div className="card">
      <h2 style={{ fontSize: "1rem", marginBottom: "15px" }}>Atribución de Alpha</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        <SmallMetric label="Market Factor" value={c.market} />
        <SmallMetric label="Fundamentals" value={c.fundamental} />
        <SmallMetric label="Structural" value={c.structural} />
        <SmallMetric label="Confidence" value={c.confidence} />
      </div>
    </div>
  );
}

function BloqueConfiguracion({ meta }) {
  return (
    <div className="card" style={{ border: "1px dashed #334155", backgroundColor: "transparent" }}>
      <h2 style={{ fontSize: "1rem", color: "#94a3b8", marginBottom: "15px" }}>Hiperparámetros</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "0.6rem", color: "#64748b" }}>H-DAYS</div>
          <div style={{ fontWeight: "bold" }}>{meta?.horizon_days}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "0.6rem", color: "#64748b" }}>THETA</div>
          <div style={{ fontWeight: "bold" }}>{meta?.theta}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "0.6rem", color: "#64748b" }}>K-NN</div>
          <div style={{ fontWeight: "bold" }}>{meta?.k_neighbors}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "0.6rem", color: "#64748b" }}>ALPHA</div>
          <div style={{ fontWeight: "bold" }}>{meta?.alpha}</div>
        </div>
      </div>
    </div>
  );
}

// --- HELPERS ---

function Metric({ label, value, color, strong }) {
  return (
    <div>
      <div style={{ fontSize: "0.65rem", color: "#94a3b8", textTransform: "uppercase" }}>{label}</div>
      <div style={{ color: color || "#f8fafc", fontWeight: strong ? 800 : 600, fontSize: strong ? "1.3rem" : "1rem" }}>
        {value ?? "—"}
      </div>
    </div>
  );
}

function SmallMetric({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px", backgroundColor: "#0f172a", borderRadius: "6px" }}>
      <span style={{ color: "#94a3b8", fontSize: "0.75rem" }}>{label}</span>
      <span style={{ fontWeight: "bold", fontSize: "0.85rem" }}>{value?.toFixed(3) ?? "—"}</span>
    </div>
  );
}

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
          
