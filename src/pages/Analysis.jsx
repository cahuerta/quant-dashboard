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
    full_latest: null
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
          full_latest: last || null
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

  // 4. Preparación de datos para Gráfico B: Proyección Futura con Banda de Incertidumbre
  const chartDataFuture = useMemo(() => {
    if (!data.prediction || !data.full_latest) return [];

    const priceNow = data.prediction.price_now;
    const finalPrice = data.prediction.price_pred;
    const curve = data.full_latest.price_curve;
    const hitRate = data.historical?.hit_rate_mean ?? 0.5;

    const rows = [];
    rows.push({
      day: 0,
      label: "Hoy",
      price: priceNow,
      upper: priceNow,
      lower: priceNow
    });

    if (curve?.price_path) {
      curve.price_path.forEach((p, i) => {
        const day = i + 1;
        const uncertainty = p * (1 - hitRate) * 0.05 * (day / 10);
        rows.push({
          day,
          label: `T+${day}`,
          price: p,
          upper: p + uncertainty,
          lower: p - uncertainty
        });
      });
    }

    const finalUncertainty = finalPrice * (1 - hitRate) * 0.05;
    rows.push({
      day: 10,
      label: "T+10",
      price: finalPrice,
      upper: finalPrice + finalUncertainty,
      lower: finalPrice - finalUncertainty
    });

    return rows;
  }, [data.prediction, data.full_latest, data.historical]);

  // Helper: Detección de mercado chileno
  const isChile = ticker.endsWith(".SN") || ticker.endsWith(".CL");

  return (
    <div
      style={{
        padding: "20px",
        background: "#0f172a",
        minHeight: "100vh",
        color: "white",
        fontFamily: "system-ui, -apple-system, sans-serif"
      }}
    >
      {/* HEADER SECTION */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        marginBottom: "25px" 
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.8rem" }}>
            Terminal de Análisis: {ticker || "---"}
          </h1>
          <p style={{ color: "#94a3b8", margin: "5px 0" }}>
            {isChile ? "Mercado Local Chileno 🇨🇱" : "Mercado Internacional 🌎"} | Predictivo v3.0
          </p>
        </div>

        <select
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          style={{ 
            padding: "10px 15px", 
            borderRadius: "8px", 
            backgroundColor: "#1e293b", 
            color: "white", 
            border: "1px solid #334155",
            fontSize: "14px"
          }}
        >
          <option value="">Seleccionar Activo...</option>
          {tickers.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {loading && (
        <div style={{ 
          color: "#fbbf24", 
          textAlign: "center", 
          padding: "20px",
          fontSize: "1.1rem"
        }}>
          Sincronizando modelos neuronales...
        </div>
      )}

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
            <div style={{ 
              background: "#1e293b",
              padding: "20px", 
              borderRadius: "12px", 
              border: "1px solid #334155",
              height: "400px"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "15px" }}>
                <h2 style={{ fontSize: "1.1rem", margin: 0 }}>Backtest: Real vs. Predicho</h2>
                <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Retorno por ventana %</span>
              </div>
              <ResponsiveContainer width="100%" height="85%">
                <LineChart data={chartDataHistorical}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={10} unit="%" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "#0f172a", 
                      border: "1px solid #334155",
                      borderRadius: "8px" 
                    }} 
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: "12px" }} />
                  <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
                  <Line 
                    name="Real" 
                    type="monotone" 
                    dataKey="real" 
                    stroke="#38bdf8" 
                    strokeWidth={3} 
                    dot={false} 
                  />
                  <Line 
                    name="Modelo" 
                    type="monotone" 
                    dataKey="pred" 
                    stroke="#fbbf24" 
                    strokeWidth={3} 
                    strokeDasharray="5 5" 
                    dot={false} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Gráfico de Proyección con Banda de Incertidumbre */}
            <div style={{ 
              background: "linear-gradient(145deg, #1e293b, #0f172a)",
              padding: "20px", 
              borderRadius: "12px", 
              border: "1px solid #334155",
              height: "400px"
            }}>
              <h2 style={{ 
                fontSize: "1.1rem", 
                margin: "0 0 15px 0", 
                color: "#fbbf24" 
              }}>
                Proyección con Banda de Incertidumbre
              </h2>
              <ResponsiveContainer width="100%" height="85%">
                <AreaChart data={chartDataFuture}>
                  <defs>
                    <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={11} 
                    tickFormatter={(v) =>
                      isChile
                        ? `$${Math.round(v).toLocaleString("es-CL")}`
                        : `$${v.toFixed(2)}`
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      border: "1px solid #334155",
                      borderRadius: "8px"
                    }}
                    formatter={(v, name) => {
                      if (name === "price")
                        return [`$${v.toFixed(2)}`, "Precio"];
                      if (name === "upper")
                        return [`$${v.toFixed(2)}`, "Banda superior"];
                      if (name === "lower")
                        return [`$${v.toFixed(2)}`, "Banda inferior"];
                      return [v, name];
                    }}
                  />
                  {/* Banda superior */}
                  <Area
                    type="monotone"
                    dataKey="upper"
                    stroke="none"
                    fill="#fbbf24"
                    fillOpacity={0.07}
                  />
                  {/* Banda inferior */}
                  <Area
                    type="monotone"
                    dataKey="lower"
                    stroke="none"
                    fill="#1e293b"
                  />
                  {/* Línea principal de predicción */}
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke="#fbbf24"
                    strokeWidth={3}
                    fill="url(#priceGradient)"
                    dot={(props) => {
                      const { cx, cy, payload } = props;
                      if (payload.day === 0) {
                        return (
                          <circle
                            cx={cx}
                            cy={cy}
                            r={6}
                            fill="#38bdf8"
                            stroke="white"
                            strokeWidth={2}
                          />
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine
                    y={data.prediction.price_now}
                    stroke="#475569"
                    strokeDasharray="3 3"
                    label={{ position: "top", fill: "#94a3b8", fontSize: 11 }}
                  />
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

      {!loading && !data.prediction && ticker && (
        <div style={{ 
          textAlign: "center", 
          color: "#94a3b8", 
          padding: "40px",
          fontSize: "1.1rem"
        }}>
          No se encontraron datos para {ticker}. Selecciona otro activo.
        </div>
      )}
    </div>
  );
}

// --- SUB-COMPONENTES AUXILIARES ---

function BloqueResumen({ prediction, isChile }) {
  const isBuy = prediction.recommendation === "COMPRA";
  const color = isBuy 
    ? "#22c55e" 
    : prediction.recommendation === "VENTA" 
    ? "#ef4444" 
    : "#eab308";

  return (
    <div style={{ 
      padding: "20px", 
      background: "#1e293b",
      borderRadius: "12px", 
      border: "1px solid #334155",
      borderLeft: `6px solid ${color}`
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "15px" }}>
        <h2 style={{ fontSize: "0.9rem", color: "#94a3b8", margin: 0 }}>RECOMENDACIÓN</h2>
        <span style={{ fontWeight: "900", color: color, fontSize: "1.1rem" }}>
          {prediction.recommendation}
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
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
    <div style={{ 
      padding: "20px", 
      background: "#1e293b",
      borderRadius: "12px", 
      border: "1px solid #334155",
      textAlign: "center"
    }}>
      <h2 style={{ fontSize: "0.9rem", color: "#94a3b8", margin: "0 0 10px 0" }}>ALPHA SCORE</h2>
      <div style={{ fontSize: "3rem", fontWeight: "900", color: color, margin: "10px 0" }}>
        {score.toFixed(3)}
      </div>
      <div style={{ height: "8px", background: "#334155", borderRadius: "4px" }}>
        <div style={{ 
          width: `${score * 100}%`, 
          height: "100%", 
          background: color, 
          borderRadius: "4px",
          transition: "width 0.3s ease"
        }} />
      </div>
    </div>
  );
}

function BloqueRobustez({ historical }) {
  const hit = (historical?.hit_rate_mean ?? 0) * 100;
  return (
    <div style={{ 
      padding: "20px", 
      background: "#1e293b",
      borderRadius: "12px", 
      border: "1px solid #334155"
    }}>
      <h2 style={{ fontSize: "0.9rem", color: "#94a3b8", margin: "0 0 15px 0" }}>
        ROBUSTEZ (BACKTEST)
      </h2>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "10px" }}>
        <span>Ventanas calculadas:</span>
        <span style={{ fontWeight: "bold", color: "white" }}>{historical?.n_windows || 0}</span>
      </div>
      <Metric 
        label="Hit Rate Total" 
        value={`${hit.toFixed(1)}%`} 
        color={hit > 50 ? "#22c55e" : "#ef4444"} 
        strong 
      />
    </div>
  );
}

function BloqueAlphaDetalle({ alphaData }) {
  const c = alphaData?.components || {};
  return (
    <div style={{ 
      padding: "20px", 
      background: "#1e293b",
      borderRadius: "12px", 
      border: "1px solid #334155"
    }}>
      <h2 style={{ fontSize: "1.1rem", marginBottom: "20px", color: "#f8fafc" }}>
        Atribución de Alpha
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
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
    <div style={{ 
      padding: "20px", 
      border: "1px dashed #334155", 
      backgroundColor: "#1e293b",
      borderRadius: "12px"
    }}>
      <h2 style={{ 
        fontSize: "1.1rem", 
        color: "#94a3b8", 
        marginBottom: "20px" 
      }}>
        Hiperparámetros
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "15px" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "0.7rem", color: "#64748b", marginBottom: "5px" }}>H-DAYS</div>
          <div style={{ fontWeight: "bold", fontSize: "1.2rem" }}>{meta?.horizon_days || "—"}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "0.7rem", color: "#64748b", marginBottom: "5px" }}>THETA</div>
          <div style={{ fontWeight: "bold", fontSize: "1.2rem" }}>{meta?.theta || "—"}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "0.7rem", color: "#64748b", marginBottom: "5px" }}>K-NN</div>
          <div style={{ fontWeight: "bold", fontSize: "1.2rem" }}>{meta?.k_neighbors || "—"}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "0.7rem", color: "#64748b", marginBottom: "5px" }}>ALPHA</div>
          <div style={{ fontWeight: "bold", fontSize: "1.2rem" }}>{meta?.alpha || "—"}</div>
        </div>
      </div>
    </div>
  );
}

// --- HELPERS ---

function Metric({ label, value, color, strong }) {
  return (
    <div>
      <div style={{ 
        fontSize: "0.7rem", 
        color: "#94a3b8", 
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        marginBottom: "4px"
      }}>
        {label}
      </div>
      <div style={{ 
        color: color || "#f8fafc", 
        fontWeight: strong ? 900 : 600, 
        fontSize: strong ? "1.5rem" : "1.1rem" 
      }}>
        {value ?? "—"}
      </div>
    </div>
  );
}

function SmallMetric({ label, value }) {
  return (
    <div style={{ 
      display: "flex", 
      justifyContent: "space-between", 
      padding: "12px", 
      backgroundColor: "#0f172a", 
      borderRadius: "8px",
      border: "1px solid #334155"
    }}>
      <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>{label}</span>
      <span style={{ 
        fontWeight: "bold", 
        fontSize: "0.9rem",
        minWidth: "50px",
        textAlign: "right"
      }}>
        {value?.toFixed(3) ?? "—"}
      </span>
    </div>
  );
}

function formatMoney(v, isChile) {
  if (v == null) return "—";
  return isChile 
    ? "$" + Math.round(v).toLocaleString("es-CL")
    : "$" + Number(v).toLocaleString(undefined, { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      });
}

function formatPct(v) {
  if (v == null) return "—";
  return (v > 0 ? "+" : "") + Number(v).toFixed(2) + "%";
}
