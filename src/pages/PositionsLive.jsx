import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

const API = import.meta.env.VITE_API_URL;

// =========================
// 🎨 Colores
// =========================
function colorReturn(v) {
  if (v == null) return "#94a3b8";
  return v > 0 ? "#22c55e" : v < 0 ? "#ef4444" : "#94a3b8";
}

function statusBadge(value) {
  if (value === true)
    return <span style={{ color: "#22c55e", fontWeight: 700 }}>✔ Correcto</span>;
  if (value === false)
    return <span style={{ color: "#ef4444", fontWeight: 700 }}>✖ Incorrecto</span>;
  return <span style={{ color: "#94a3b8" }}>Pendiente</span>;
}

// =========================
// 📊 Componente
// =========================
export default function PositionsLive() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!API) {
      setError("Falta VITE_API_URL");
      setLoading(false);
      return;
    }

    async function load() {
      try {
        setLoading(true);
        setError(null);

        // 1️⃣ Posiciones reales desde Alpaca
        const pRes = await fetch(`${API}/trading/positions`, { cache: "no-store" });
        if (!pRes.ok) throw new Error("Error cargando posiciones");

        const positions = await pRes.json();
        const tickers = Object.keys(positions);

        const results = await Promise.all(
          tickers.map(async (ticker) => {
            const pos = positions[ticker];

            const entryPrice   = pos.avg_entry_price;
            const marketValue  = pos.market_value;
            const qty          = pos.qty;
            const currentPrice = marketValue / qty;
            const currentReturn =
              entryPrice > 0 ? (currentPrice / entryPrice - 1) * 100 : null;

            // 2️⃣ Última predicción del modelo
            let lastPrediction = null;
            try {
              const lRes = await fetch(`${API}/dashboard/latest/${ticker}`);
              if (lRes.ok) {
                const lJson = await lRes.json();
                lastPrediction = lJson?.latest?.prediction?.ret_ens_pct ?? null;
              }
            } catch {}

            // 3️⃣ ¿Modelo acertó?
            // Compara dirección predicha vs retorno real desde precio de entrada.
            // Siempre en tiempo real, sin depender de evaluaciones guardadas.
            const modelCorrect =
              lastPrediction != null && currentReturn != null
                ? lastPrediction > 0
                  ? currentReturn >= 0  // predijo subida → ¿subió?
                  : currentReturn <= 0  // predijo bajada → ¿bajó?
                : null;

            return {
              ticker,
              qty,
              entryPrice,
              currentPrice,
              currentReturn,
              unrealizedPL: pos.unrealized_pl,
              lastPrediction,
              modelCorrect,
            };
          })
        );

        setRows(results);
      } catch (err) {
        console.error(err);
        setError("Error cargando posiciones activas");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const summary = useMemo(() => {
    const total     = rows.length;
    const correct   = rows.filter((r) => r.modelCorrect === true).length;
    const incorrect = rows.filter((r) => r.modelCorrect === false).length;
    const totalPL   = rows.reduce((acc, r) => acc + (r.unrealizedPL || 0), 0);
    return { total, correct, incorrect, totalPL };
  }, [rows]);

  if (loading) return <div className="global-loading">Cargando...</div>;
  if (error)   return <div className="global-loading">{error}</div>;

  return (
    <div className="global-container">
      <div className="global-header">
        <h1>Posiciones Activas</h1>
        <div style={{ color: "#94a3b8" }}>{summary.total} posiciones abiertas</div>
      </div>

      {/* Métricas resumen */}
      <div style={{ marginBottom: 20 }}>
        <div>
          Total resultado acumulado:
          <span style={{ marginLeft: 8, fontWeight: 700, color: colorReturn(summary.totalPL) }}>
            ${summary.totalPL.toFixed(2)}
          </span>
        </div>
        <div>Predicciones correctas: {summary.correct}</div>
        <div>Predicciones incorrectas: {summary.incorrect}</div>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Activo</th>
            <th>Cantidad</th>
            <th>Precio Entrada</th>
            <th>Precio Actual</th>
            <th>Resultado Actual (%)</th>
            <th>Resultado en USD</th>
            <th>Última Predicción Modelo (%)</th>
            <th>¿Modelo Acertó?</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((r) => (
            <tr key={r.ticker}>
              <td>
                <Link
                  to={`/analysis?ticker=${r.ticker}`}
                  style={{ color: "#38bdf8", fontWeight: 700, textDecoration: "none" }}
                >
                  {r.ticker}
                </Link>
              </td>

              <td>{r.qty}</td>
              <td>${r.entryPrice.toFixed(2)}</td>
              <td>${r.currentPrice.toFixed(2)}</td>

              <td style={{ color: colorReturn(r.currentReturn), fontWeight: 700 }}>
                {r.currentReturn != null ? r.currentReturn.toFixed(2) + "%" : "—"}
              </td>

              <td style={{ color: colorReturn(r.unrealizedPL), fontWeight: 700 }}>
                ${r.unrealizedPL.toFixed(2)}
              </td>

              <td style={{ color: colorReturn(r.lastPrediction), fontWeight: 700 }}>
                {r.lastPrediction != null ? r.lastPrediction.toFixed(2) + "%" : "—"}
              </td>

              <td>{statusBadge(r.modelCorrect)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
