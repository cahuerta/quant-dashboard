import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

const API = import.meta.env.VITE_API_URL;

export default function Analysis() {

  const [searchParams] = useSearchParams();
  const queryTicker = searchParams.get("ticker");

  const [ticker, setTicker] = useState(queryTicker || "");
  const [tickers, setTickers] = useState([]);

  const [meta, setMeta] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [historical, setHistorical] = useState(null);

  const [loading, setLoading] = useState(false);

  // ===============================
  // Cargar tickers
  // ===============================
  useEffect(() => {
    async function loadTickers() {
      const res = await fetch(`${API}/dashboard/tickers`);
      const json = await res.json();
      setTickers(json?.tickers || []);
    }
    loadTickers();
  }, []);

  // ===============================
  // Cargar análisis completo
  // ===============================
  useEffect(() => {
    if (!ticker) return;

    async function loadData() {
      setLoading(true);

      const res = await fetch(`${API}/dashboard/latest/${ticker}`);
      const json = res.ok ? await res.json() : null;

      const last = json?.latest;

      setMeta(last?.meta || null);
      setPrediction(last?.prediction || null);
      setHistorical(last?.historical || null);

      setLoading(false);
    }

    loadData();
  }, [ticker]);

  // ===============================
  // UI
  // ===============================
  return (
    <div className="global-container">

      <div className="global-header">
        <h1>Análisis Enterprise</h1>

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

      {loading && <div className="global-loading">Cargando...</div>}

      {!loading && prediction && (
        <>
          <BloquePrediccion prediction={prediction} />
          <BloqueModelo historical={historical} />
          <BloqueConfiguracion meta={meta} />
        </>
      )}
    </div>
  );
}

////////////////////////////////////////////////////////////
// 🔥 BLOQUE PREDICCIÓN
////////////////////////////////////////////////////////////

function BloquePrediccion({ prediction }) {

  const color =
    prediction.recommendation === "COMPRA"
      ? "#22c55e"
      : prediction.recommendation === "VENTA"
      ? "#ef4444"
      : "#facc15";

  return (
    <div className="card">
      <h2>Predicción Actual</h2>

      <div className="grid-3">

        <Metric label="Fecha Base" value={prediction.date_base} />

        <Metric
          label="Precio Actual"
          value={formatMoney(prediction.price_now)}
        />

        <Metric
          label="Precio Estimado"
          value={formatMoney(prediction.price_pred)}
        />

        <Metric
          label="Retorno Ensamble"
          value={formatPct(prediction.ret_ens_pct)}
        />

        <Metric
          label="Alpha (Modelo Global)"
          value={formatPct(prediction.ret_global_pct)}
        />

        <Metric
          label="KNN"
          value={formatPct(prediction.ret_knn_pct)}
        />

        <Metric
          label="Recomendación"
          value={prediction.recommendation}
          color={color}
        />

        <Metric
          label="Dimensiones PCA"
          value={prediction.pca_dims_effective}
        />

        <Metric
          label="N° Features"
          value={prediction.n_features}
        />

      </div>
    </div>
  );
}

////////////////////////////////////////////////////////////
// 🔥 BLOQUE MODELO
////////////////////////////////////////////////////////////

function BloqueModelo({ historical }) {

  if (!historical) return null;

  return (
    <div className="card">
      <h2>Calidad Histórica del Modelo</h2>

      <div className="grid-3">

        <Metric
          label="Tasa de Acierto"
          value={formatPct(historical.hit_rate_mean * 100, true)}
        />

        <Metric
          label="Error Medio (MAE)"
          value={historical.mae_mean?.toFixed(4)}
        />

        <Metric
          label="Error Cuadrático (RMSE)"
          value={historical.rmse_mean?.toFixed(4)}
        />

        <Metric
          label="Ventanas Analizadas"
          value={historical.n_windows}
        />

        <Metric
          label="Dimensiones PCA"
          value={historical.pca_dims}
        />

        <Metric
          label="Features"
          value={historical.n_features}
        />

      </div>
    </div>
  );
}

////////////////////////////////////////////////////////////
// 🔥 BLOQUE CONFIGURACIÓN MODELO
////////////////////////////////////////////////////////////

function BloqueConfiguracion({ meta }) {

  if (!meta) return null;

  return (
    <div className="card">
      <h2>Configuración del Modelo</h2>

      <div className="grid-3">

        <Metric label="Horizonte (días)" value={meta.horizon_days} />
        <Metric label="Theta" value={meta.theta} />
        <Metric label="Vecinos KNN" value={meta.k_neighbors} />
        <Metric label="Alpha" value={meta.alpha} />
        <Metric label="PCA Target" value={meta.pca_target} />
        <Metric label="Periodo Histórico" value={meta.period} />

      </div>
    </div>
  );
}

////////////////////////////////////////////////////////////
// COMPONENTE MÉTRICA
////////////////////////////////////////////////////////////

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

////////////////////////////////////////////////////////////
// HELPERS
////////////////////////////////////////////////////////////

function formatMoney(v) {
  if (v == null) return "—";
  return "$" + v.toFixed(2);
}

function formatPct(v, alreadyPct = false) {
  if (v == null) return "—";
  return (alreadyPct ? v.toFixed(1) : (v * 100).toFixed(2)) + "%";
          }
