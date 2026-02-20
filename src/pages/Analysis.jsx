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
          <BloqueResumen prediction={prediction} />
          <BloqueModelo historical={historical} />
          <BloqueConfiguracion meta={meta} />
        </>
      )}
    </div>
  );
}

////////////////////////////////////////////////////////////
// 🔥 BLOQUE RESUMEN EJECUTIVO
////////////////////////////////////////////////////////////

function BloqueResumen({ prediction }) {

  const retorno = prediction.ret_ens_pct ?? 0;

  const colorRetorno =
    retorno > 0 ? "#22c55e" :
    retorno < 0 ? "#ef4444" :
    "#94a3b8";

  const colorRecomendacion =
    prediction.recommendation === "COMPRA"
      ? "#22c55e"
      : prediction.recommendation === "VENTA"
      ? "#ef4444"
      : "#eab308";

  return (
    <div className="card">
      <h2>Resumen Ejecutivo</h2>

      <div className="grid-3">

        <Metric
          label="Recomendación"
          value={prediction.recommendation}
          color={colorRecomendacion}
          strong
        />

        <Metric
          label="Retorno Esperado"
          value={formatPct(prediction.ret_ens_pct)}
          color={colorRetorno}
          strong
        />

        <Metric
          label="Precio Actual"
          value={formatMoney(prediction.price_now)}
        />

        <Metric
          label="Precio Objetivo"
          value={formatMoney(prediction.price_pred)}
        />

        <Metric
          label="Modelo Global"
          value={formatPct(prediction.ret_global_pct)}
        />

        <Metric
          label="Modelo KNN"
          value={formatPct(prediction.ret_knn_pct)}
        />

      </div>
    </div>
  );
}

////////////////////////////////////////////////////////////
// 🔥 BLOQUE SALUD DEL MODELO
////////////////////////////////////////////////////////////

function BloqueModelo({ historical }) {

  if (!historical) return null;

  const hit = (historical.hit_rate_mean ?? 0) * 100;

  const colorHit =
    hit >= 60 ? "#22c55e" :
    hit >= 50 ? "#eab308" :
    "#ef4444";

  const colorMae =
    historical.mae_mean < 0.03 ? "#22c55e" :
    historical.mae_mean < 0.06 ? "#eab308" :
    "#ef4444";

  return (
    <div className="card">
      <h2>Salud del Modelo</h2>

      <div className="grid-3">

        <Metric
          label="Tasa de Acierto"
          value={hit.toFixed(1) + "%"}
          color={colorHit}
          strong
        />

        <Metric
          label="Error Medio (MAE)"
          value={historical.mae_mean?.toFixed(4)}
          color={colorMae}
        />

        <Metric
          label="Error Cuadrático (RMSE)"
          value={historical.rmse_mean?.toFixed(4)}
        />

        <Metric
          label="Ventanas Analizadas"
          value={historical.n_windows}
        />

      </div>
    </div>
  );
}

////////////////////////////////////////////////////////////
// 🔥 BLOQUE CONFIGURACIÓN
////////////////////////////////////////////////////////////

function BloqueConfiguracion({ meta }) {

  if (!meta) return null;

  return (
    <div className="card">
      <h2>Configuración Técnica</h2>

      <div className="grid-3">

        <Metric label="Horizonte (días)" value={meta.horizon_days} />
        <Metric label="Theta" value={meta.theta} />
        <Metric label="Vecinos KNN" value={meta.k_neighbors} />
        <Metric label="Alpha Param" value={meta.alpha} />
        <Metric label="PCA Target" value={meta.pca_target} />
        <Metric label="Periodo Histórico" value={meta.period} />

      </div>
    </div>
  );
}

////////////////////////////////////////////////////////////
// COMPONENTE MÉTRICA MEJORADO
////////////////////////////////////////////////////////////

function Metric({ label, value, color, strong }) {
  return (
    <div className="metric">
      <div className="metric-label">{label}</div>
      <div
        className="metric-value"
        style={{
          color: color || "inherit",
          fontWeight: strong ? 800 : 600,
          fontSize: strong ? "1.3rem" : "1rem"
        }}
      >
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

function formatPct(v) {
  if (v == null) return "—";
  return (v * 100).toFixed(2) + "%";
}
