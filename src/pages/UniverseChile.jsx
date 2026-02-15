import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const API = "https://spy-2w-price-prediction.onrender.com";

export default function UniverseChile() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadUniverseChile() {
      try {
        // 1️⃣ Obtener tickers
        const tRes = await fetch(`${API}/dashboard/tickers`);
        if (!tRes.ok) throw new Error("Tickers error");
        const tJson = await tRes.json();

        // 🔹 SOLO CHILE
        const tickers = (tJson.tickers || []).filter((t) =>
          t.endsWith(".SN")
        );

        // 2️⃣ Obtener signals (para fundamental_flag)
        const sRes = await fetch(`${API}/signals`);
        if (!sRes.ok) throw new Error("Signals error");
        const sJson = await sRes.json();

        const signalsMap = {};
        if (Array.isArray(sJson.signals)) {
          sJson.signals.forEach((s) => {
            if (!s.error) {
              signalsMap[s.ticker] = s.fundamental_flag || null;
            }
          });
        }

        // 3️⃣ Obtener latest prediction
        const results = await Promise.all(
          tickers.map(async (ticker) => {
            try {
              const lRes = await fetch(
                `${API}/dashboard/latest/${ticker}`
              );
              if (!lRes.ok) return null;

              const lJson = await lRes.json();
              const p = lJson.latest?.prediction;
              if (!p) return null;

              return {
                ticker,
                recommendation: p.recommendation,
                price_now: p.price_now,
                price_pred: p.price_pred,
                ret_ens_pct: p.ret_ens_pct ?? 0,
                fundamental_flag: signalsMap[ticker] || null,
              };
            } catch {
              return null;
            }
          })
        );

        const clean = results
          .filter(Boolean)
          .sort((a, b) => b.ret_ens_pct - a.ret_ens_pct);

        setRows(clean);
      } catch (err) {
        console.error(err);
        setError("No se pudo cargar Universe Chile");
      } finally {
        setLoading(false);
      }
    }

    loadUniverseChile();
  }, []);

  if (loading)
    return <div className="global-loading">Cargando Universe Chile...</div>;

  if (error)
    return <div className="global-loading">{error}</div>;

  return (
    <div className="global-container">
      <div className="global-header">
        <h1>Universe Chile 🇨🇱</h1>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Ticker</th>
            <th>Modelo</th>
            <th>Precio</th>
            <th>Objetivo</th>
            <th>Retorno</th>
            <th>Fundamental</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((r) => (
            <tr key={r.ticker}>
              {/* 🔥 Click → Analysis */}
              <td>
                <Link
                  to={`/analysis?ticker=${r.ticker}`}
                  style={{
                    color: "#38bdf8",
                    textDecoration: "none",
                    fontWeight: 600,
                  }}
                >
                  {r.ticker}
                </Link>
              </td>

              <td>{r.recommendation || "—"}</td>

              <td>
                {r.price_now != null
                  ? Number(r.price_now).toFixed(2)
                  : "—"}
              </td>

              <td>
                {r.price_pred != null
                  ? Number(r.price_pred).toFixed(2)
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
                {r.ret_ens_pct.toFixed(2)}%
              </td>

              <td>{r.fundamental_flag || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
