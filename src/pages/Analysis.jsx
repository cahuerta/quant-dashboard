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
  const [alphaData, setAlphaData] = useState(null);

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

      // 🔥 NUEVO: cargar alpha persistido
      const alphaRes = await fetch(`${API}/alpha`);
      const alphaJson = alphaRes.ok ? await alphaRes.json() : null;

      const alphaForTicker = alphaJson?.results?.[ticker] || null;
      setAlphaData(alphaForTicker);

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
          <BloqueAlpha alphaData={alphaData} />
          <BloqueModelo historical={historical} />
          <BloqueConfiguracion meta={meta} />
        </>
      )}
    </div>
  );
}

////////////////////////////////////////////////////////////
// 🔥 BLOQUE ALPHA COMPLETO (VIGILANCIA)
////////////////////////////////////////////////////////////

function BloqueAlpha({ alphaData }) {

  if (!alphaData || alphaData.error) {
    return (
      <div className="card">
        <h2>Alpha</h2>
        <div className="global-loading">No disponible</div>
      </div>
    );
  }

  const score = alphaData.alpha_score ?? 0;

  const colorAlpha =
    score >= 0.65 ? "#22c55e" :
    score >= 0.5 ? "#eab308" :
    "#ef4444";

  const c = alphaData.components || {};
  const raw = alphaData.raw || {};

  return (
    <div className="card">
      <h2>Alpha — Sistema Completo</h2>

      <div className="grid-3">

        <Metric
          label="Alpha Score"
          value={score.toFixed(3)}
          color={colorAlpha}
          strong
        />

        <Metric label="Return (norm)" value={c.return?.toFixed(3)} />
        <Metric label="Confidence" value={c.confidence?.toFixed(3)} />
        <Metric label="Hit Rate (norm)" value={c.hit_rate?.toFixed(3)} />
        <Metric label="Error (norm)" value={c.error_component?.toFixed(3)} />
        <Metric label="Structural" value={c.structural?.toFixed(3)} />
        <Metric label="Fundamental" value={c.fundamental?.toFixed(3)} />
        <Metric label="Market" value={c.market?.toFixed(3)} />

      </div>

      <hr style={{ margin: "20px 0" }} />

      <div className="grid-3">

        <Metric label="Raw Return %" value={raw.ret_pct?.toFixed(2)} />
        <Metric label="Raw Hit Rate" value={raw.hit_rate?.toFixed(3)} />
        <Metric label="Raw MAE" value={raw.mae?.toFixed(3)} />

      </div>

    </div>
  );
}

////////////////////////////////////////////////////////////
// 🔥 BLOQUE RESUMEN
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

      </div>
    </div>
  );
}

////////////////////////////////////////////////////////////
// 🔥 SALUD MODELO
////////////////////////////////////////////////////////////

function BloqueModelo({ historical }) {

  if (!historical) return null;

  const hit = (historical.hit_rate_mean ?? 0) * 100;

  const colorHit =
    hit >= 60 ? "#22c55e" :
    hit >= 50 ? "#eab308" :
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
          label="Error Medio"
          value={historical.mae_mean?.toFixed(4)}
        />

        <Metric
          label="Ventanas"
          value={historical.n_windows}
        />

      </div>
    </div>
  );
}

////////////////////////////////////////////////////////////
// CONFIG
////////////////////////////////////////////////////////////

function BloqueConfiguracion({ meta }) {

  if (!meta) return null;

  return (
    <div className="card">
      <h2>Configuración Técnica</h2>

      <div className="grid-3">
        <Metric label="Horizonte" value={meta.horizon_days} />
        <Metric label="Theta" value={meta.theta} />
        <Metric label="Vecinos" value={meta.k_neighbors} />
        <Metric label="Alpha Param" value={meta.alpha} />
      </div>
    </div>
  );
}

////////////////////////////////////////////////////////////
// MÉTRICA
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
  return "$" + Number(v).toFixed(2);
}

function formatPct(v) {
  if (v == null) return "—";
  return Number(v).toFixed(2) + "%";
}
