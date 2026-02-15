import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

const API = "https://spy-2w-price-prediction.onrender.com";

export default function Analysis() {
  const [searchParams] = useSearchParams();
  const queryTicker = searchParams.get("ticker");

  const [tickers, setTickers] = useState([]);
  const [ticker, setTicker] = useState(queryTicker || "");
  const [latest, setLatest] = useState(null);
  const [summary, setSummary] = useState(null);
  const [signal, setSignal] = useState(null);
  const [loading, setLoading] = useState(false);

  // 🔹 Cargar lista de tickers
  useEffect(() => {
    async function loadTickers() {
      try {
        const res = await fetch(`${API}/dashboard/tickers`);
        if (!res.ok) throw new Error("Tickers error");
        const json = await res.json();
        setTickers(json.tickers || []);
      } catch (err) {
        console.error("Tickers load error:", err);
      }
    }

    loadTickers();
  }, []);

  // 🔹 Cargar datos del ticker
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

        let signalData = null;

        if (signalsJson?.signals) {
          signalData = signalsJson.signals.find(
            s => s.ticker === ticker && !s.error
          );
        }

        setLatest(latestJson);
        setSummary(summaryJson);
        setSignal(signalData);
      } catch (err) {
        console.error("Analysis load error:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [ticker]);

  return (
    <div className="global-container">

      <div className="global-header">
        <h1>Análisis Completo</h1>

        <select
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          style={{
            padding: "8px 12px",
            background: "#111827",
            color: "white",
            border: "1px solid #334155",
            borderRadius: "6px"
          }}
        >
          <option value="">Seleccionar activo</option>
          {tickers.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="global-loading">Cargando análisis...</div>
      )}

      {!loading && ticker && latest && (
        <>
          {/* Snapshot */}
          <div className="card">
            <h2>Snapshot Actual</h2>
            <pre>{JSON.stringify(latest.latest, null, 2)}</pre>
          </div>

          {/* Histórico */}
          {summary && (
            <div className="card">
              <h2>Histórico Predicciones</h2>
              <pre>{JSON.stringify(summary.data, null, 2)}</pre>
            </div>
          )}

          {/* Signal */}
          {signal && (
            <div className="card">
              <h2>Signal</h2>
              <pre>{JSON.stringify(signal, null, 2)}</pre>
            </div>
          )}
        </>
      )}

    </div>
  );
}
