import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

const API = "https://spy-2w-price-prediction.onrender.com";

export default function Analysis() {
  const [searchParams] = useSearchParams();
  const queryTicker = searchParams.get("ticker");

  const [ticker, setTicker] = useState(queryTicker || "");
  const [tickers, setTickers] = useState([]);

  const [latest, setLatest] = useState(null);
  const [summary, setSummary] = useState(null);
  const [signal, setSignal] = useState(null);

  const [loading, setLoading] = useState(false);

  // =========================
  // Cargar lista activos
  // =========================
  useEffect(() => {
    async function loadTickers() {
      const res = await fetch(`${API}/dashboard/tickers`);
      const json = await res.json();
      setTickers(json.tickers || []);
    }
    loadTickers();
  }, []);

  // =========================
  // Cargar análisis
  // =========================
  useEffect(() => {
    if (!ticker) return;

    async function loadData() {
      setLoading(true);

      const [latestRes, summaryRes, signalsRes] = await Promise.all([
        fetch(`${API}/dashboard/latest/${ticker}`),
        fetch(`${API}/dashboard/predictions/summary?ticker=${ticker}&limit=60`),
        fetch(`${API}/signals`)
      ]);

      const latestJson = latestRes.ok ? await latestRes.json() : null;
      const summaryJson = summaryRes.ok ? await summaryRes.json() : null;
      const signalsJson = signalsRes.ok ? await signalsRes.json() : null;

      const signalData = signalsJson?.signals?.find(
        s => s.ticker === ticker && !s.error
      );

      setLatest(latestJson?.latest || null);
      setSummary(summaryJson?.data || null);
      setSignal(signalData || null);

      setLoading(false);
    }

    loadData();
  }, [ticker]);

  // =========================
  // UI
  // =========================
  return (
    <div className="global-container">

      <div className="global-header">
        <h1>Análisis Completo</h1>

        <select
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          className="selector"
        >
          <option value="">Seleccionar activo</option>
          {tickers.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {loading && <div className="global-loading">Cargando análisis...</div>}

      {!loading && ticker && latest && (
        <>
          <Resumen latest={latest} signal={signal} />
          {summary && <GraficoRetornos data={summary} />}
          <Modelo latest={latest} />
        </>
      )}
    </div>
  );
}

function Resumen({ latest, signal }) {
  const color =
    latest.recommendation === "COMPRA"
      ? "#22c55e"
      : "#ef4444";

  return (
    <div className="card">
      <h2>Resumen Ejecutivo</h2>

      <div className="grid-4">

        <Metric
          label="Precio Actual"
          value={`$${latest.price_now?.toFixed(2)}`}
        />

        <Metric
          label="Precio Estimado (10d)"
          value={`$${latest.price_pred?.toFixed(2)}`}
        />

        <Metric
          label="Retorno Esperado"
          value={`${latest.ret_ens_pct?.toFixed(2)}%`}
        />

        <Metric
          label="Recomendación"
          value={latest.recommendation}
          color={color}
        />

        {signal && (
          <Metric
            label="Fuerza Señal"
            value={signal.signal_strength?.toFixed(3)}
          />
        )}

      </div>
    </div>
  );
}

function Modelo({ latest }) {
  return (
    <div className="card">
      <h2>Calidad del Modelo</h2>

      <div className="grid-3">
        <Metric
          label="Hit Rate"
          value={(latest?.historical?.hit_rate_mean * 100)?.toFixed(1) + "%"}
        />
        <Metric
          label="Error Medio (MAE)"
          value={latest?.historical?.mae_mean?.toFixed(4)}
        />
        <Metric
          label="RMSE"
          value={latest?.historical?.rmse_mean?.toFixed(4)}
        />
      </div>
    </div>
  );
}

function GraficoRetornos({ data }) {
  const values = data.slice(-30).map(d => d.ret_ens_pct);

  const max = Math.max(...values);
  const min = Math.min(...values);

  return (
    <div className="card">
      <h2>Retornos Estimados Recientes</h2>

      <div className="mini-chart">
        {values.map((v, i) => {
          const height = ((v - min) / (max - min)) * 100;
          return (
            <div
              key={i}
              className="bar"
              style={{
                height: `${height}%`,
                background: v >= 0 ? "#22c55e" : "#ef4444"
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

function Metric({ label, value, color }) {
  return (
    <div className="metric">
      <div className="metric-label">{label}</div>
      <div className="metric-value" style={{ color }}>
        {value || "—"}
      </div>
    </div>
  );
}
