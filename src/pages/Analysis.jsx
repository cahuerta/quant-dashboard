import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

const API = "https://spy-2w-price-prediction.onrender.com";

export default function Analisis() {
  const [searchParams] = useSearchParams();
  const queryTicker = searchParams.get("ticker");

  const [ticker, setTicker] = useState(queryTicker || "");
  const [activos, setActivos] = useState([]);

  const [latest, setLatest] = useState(null);
  const [resumenHistorico, setResumenHistorico] = useState(null);
  const [senal, setSenal] = useState(null);

  const [loading, setLoading] = useState(false);

  // =========================
  // Cargar lista de activos
  // =========================
  useEffect(() => {
    async function loadTickers() {
      try {
        const res = await fetch(`${API}/dashboard/tickers`);
        const json = await res.json();
        setActivos(json.tickers || []);
      } catch (err) {
        console.error("Error cargando activos:", err);
      }
    }
    loadTickers();
  }, []);

  // =========================
  // Cargar datos análisis
  // =========================
  useEffect(() => {
    if (!ticker) return;

    async function loadData() {
      setLoading(true);

      try {
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
        setResumenHistorico(summaryJson?.data || null);
        setSenal(signalData || null);
      } catch (err) {
        console.error("Error cargando análisis:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [ticker]);

  return (
    <div className="global-container">

      <div className="global-header">
        <h1>Análisis del Activo</h1>

        <select
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          className="selector"
        >
          <option value="">Seleccionar activo</option>
          {activos.map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      {loading && <div className="global-loading">Cargando análisis...</div>}

      {!loading && ticker && latest && (
        <>
          <ResumenEjecutivo latest={latest} senal={senal} />
          {resumenHistorico && <GraficoRetornos data={resumenHistorico} />}
          <CalidadModelo latest={latest} />
        </>
      )}
    </div>
  );
}

///////////////////////////////////////////////////////////
// 📌 RESUMEN EJECUTIVO
///////////////////////////////////////////////////////////

function ResumenEjecutivo({ latest, senal }) {

  const colorRecomendacion =
    latest?.recommendation === "COMPRA"
      ? "#22c55e"
      : latest?.recommendation === "VENTA"
      ? "#ef4444"
      : "#eab308";

  return (
    <div className="card">
      <h2>Resumen Ejecutivo</h2>

      <div className="grid-4">

        <Metric
          label="Precio Actual"
          value={
            latest?.price_now != null
              ? `$${latest.price_now.toFixed(2)}`
              : "—"
          }
        />

        <Metric
          label="Precio Estimado (10 días)"
          value={
            latest?.price_pred != null
              ? `$${latest.price_pred.toFixed(2)}`
              : "—"
          }
        />

        <Metric
          label="Retorno Esperado"
          value={
            latest?.ret_ens_pct != null
              ? `${latest.ret_ens_pct.toFixed(2)}%`
              : "—"
          }
        />

        <Metric
          label="Recomendación"
          value={latest?.recommendation || "—"}
          color={colorRecomendacion}
        />

        {senal && (
          <Metric
            label="Fuerza de Señal"
            value={
              senal?.signal_strength != null
                ? senal.signal_strength.toFixed(3)
                : "—"
            }
          />
        )}

      </div>
    </div>
  );
}

///////////////////////////////////////////////////////////
// 📊 CALIDAD DEL MODELO
///////////////////////////////////////////////////////////

function CalidadModelo({ latest }) {
  return (
    <div className="card">
      <h2>Calidad del Modelo</h2>

      <div className="grid-3">

        <Metric
          label="Tasa de Acierto"
          value={
            latest?.historical?.hit_rate_mean != null
              ? (latest.historical.hit_rate_mean * 100).toFixed(1) + "%"
              : "—"
          }
        />

        <Metric
          label="Error Medio (MAE)"
          value={
            latest?.historical?.mae_mean != null
              ? latest.historical.mae_mean.toFixed(4)
              : "—"
          }
        />

        <Metric
          label="Error Cuadrático (RMSE)"
          value={
            latest?.historical?.rmse_mean != null
              ? latest.historical.rmse_mean.toFixed(4)
              : "—"
          }
        />

      </div>
    </div>
  );
}

///////////////////////////////////////////////////////////
// 📈 GRÁFICO SIMPLE DE RETORNOS
///////////////////////////////////////////////////////////

function GraficoRetornos({ data }) {

  const valores = data.slice(-30).map(d => d.ret_ens_pct);

  const max = Math.max(...valores);
  const min = Math.min(...valores);
  const rango = max - min || 1;

  return (
    <div className="card">
      <h2>Retornos Estimados Recientes</h2>

      <div className="mini-chart">
        {valores.map((v, i) => {
          const altura = ((v - min) / rango) * 100;
          return (
            <div
              key={i}
              className="bar"
              style={{
                height: `${altura}%`,
                background: v >= 0 ? "#22c55e" : "#ef4444"
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

///////////////////////////////////////////////////////////
// 🔹 MÉTRICA SIMPLE
///////////////////////////////////////////////////////////

function Metric({ label, value, color }) {
  return (
    <div className="metric">
      <div className="metric-label">{label}</div>
      <div className="metric-value" style={{ color }}>
        {value ?? "—"}
      </div>
    </div>
  );
}
