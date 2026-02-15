import { useEffect, useState } from "react";

const API = "https://spy-2w-price-prediction.onrender.com";

export default function Universe() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadUniverse() {
      try {
        // 1️⃣ Obtener tickers
        const tickersRes = await fetch(`${API}/dashboard/tickers`);
        if (!tickersRes.ok) throw new Error("Error cargando tickers");

        const tickersJson = await tickersRes.json();
        const tickers = tickersJson.tickers || [];

        // 2️⃣ Obtener latest snapshot por ticker
        const promises = tickers.map(async (ticker) => {
          try {
            const res = await fetch(`${API}/dashboard/latest/${ticker}`);
            if (!res.ok) return null;

            const json = await res.json();
            const latest = json.latest?.prediction;

            if (!latest) return null;

            return {
              ticker,
              price_now: latest.price_now,
              price_pred: latest.price_pred,
              ret_ens_pct: latest.ret_ens_pct,
              recommendation: latest.recommendation,
              confidence: latest.confidence,
              fundamental_flags: latest.fundamental_flags || null,
            };
          } catch {
            return null;
          }
        });

        const results = (await Promise.all(promises)).filter(Boolean);

        // 3️⃣ Ordenar por retorno esperado descendente
        results.sort((a, b) => (b.ret_ens_pct || 0) - (a.ret_ens_pct || 0));

        setRows(results);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadUniverse();
  }, []);

  if (loading) return <div className="global-loading">Cargando Universe...</div>;
  if (error) return <div className="global-loading">Error: {error}</div>;

  return (
    <div className="global-container">
      <div className="global-header">
        <h1>Universe</h1>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Ticker</th>
            <th>Precio Actual</th>
            <th>Precio Predictivo</th>
            <th>Retorno %</th>
            <th>Señal</th>
            <th>Confianza</th>
            <th>Fundamental</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.ticker}>
              <td><strong>{r.ticker}</strong></td>

              <td>
                {r.price_now != null
                  ? `$${Number(r.price_now).toFixed(2)}`
                  : "—"}
              </td>

              <td>
                {r.price_pred != null
                  ? `$${Number(r.price_pred).toFixed(2)}`
                  : "—"}
              </td>

              <td
                style={{
                  color:
                    r.ret_ens_pct > 0
                      ? "#22c55e"
                      : r.ret_ens_pct < 0
                      ? "#ef4444"
                      : "#94a3b8",
                  fontWeight: 600,
                }}
              >
                {r.ret_ens_pct != null
                  ? (r.ret_ens_pct * 100).toFixed(2) + "%"
                  : "—"}
              </td>

              <td>
                <span className={`badge ${badgeFromSignal(r.recommendation)}`}>
                  {r.recommendation || "—"}
                </span>
              </td>

              <td>
                {r.confidence != null
                  ? (r.confidence * 100).toFixed(0) + "%"
                  : "—"}
              </td>

              <td>
                {renderFundamental(r.fundamental_flags)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ========================
// Helpers
// ========================

function badgeFromSignal(signal) {
  if (!signal) return "";

  const s = signal.toLowerCase();

  if (s.includes("comprar") || s.includes("buy")) return "badge-success";
  if (s.includes("vender") || s.includes("sell")) return "badge-danger";
  if (s.includes("mantener") || s.includes("hold")) return "badge-warning";

  return "badge-accent";
}

function renderFundamental(flags) {
  if (!flags) return "—";

  if (Array.isArray(flags)) {
    return flags.join(", ");
  }

  if (typeof flags === "object") {
    return Object.entries(flags)
      .filter(([_, v]) => v === true)
      .map(([k]) => k)
      .join(", ");
  }

  return String(flags);
                        }
