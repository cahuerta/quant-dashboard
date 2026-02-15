import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL;

export default function Screener() {
  const [strict, setStrict] = useState([]);
  const [top20, setTop20] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API}/dashboard/screener`);
        if (!res.ok) throw new Error("Screener endpoint error");

        const json = await res.json();

        setStrict(
          (json.candidates_strict || []).sort(
            (a, b) => b.score - a.score
          )
        );

        setTop20(
          (json.top20_global || []).sort(
            (a, b) => b.score - a.score
          )
        );
      } catch (err) {
        console.error(err);
        setError("No se pudo cargar screener");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading)
    return <div className="global-loading">Cargando Screener...</div>;

  if (error)
    return <div className="global-loading">{error}</div>;

  return (
    <div className="global-container">
      <div className="global-header">
        <h1>Screener</h1>
      </div>

      {/* ================= CANDIDATOS STRICT ================= */}
      <Section title="Candidatos Strict" data={strict} />

      {/* ================= TOP 20 GLOBAL ================= */}
      <Section title="Top 20 Global" data={top20} />
    </div>
  );
}

function Section({ title, data }) {
  if (!data.length) {
    return (
      <div className="global-loading">
        No hay datos para {title}
      </div>
    );
  }

  return (
    <>
      <h2 style={{ marginTop: 50 }}>{title}</h2>

      <table className="table">
        <thead>
          <tr>
            <th>#</th>
            <th>Ticker</th>
            <th>Score</th>
            <th>Quality</th>
            <th>Trend 3M</th>
            <th>RSI</th>
            <th>Sharpe</th>
            <th>Volatilidad</th>
            <th>Drawdown</th>
          </tr>
        </thead>
        <tbody>
          {data.map((c, index) => (
            <tr key={`${c.ticker}-${index}`}>
              <td>{index + 1}</td>
              <td>{c.ticker}</td>
              <td>{c.score?.toFixed(3)}</td>
              <td>{c.quality}</td>
              <td>{c.trend_3m_pct?.toFixed(2)}%</td>
              <td>{c.rsi_wilder?.toFixed(1)}</td>
              <td>{c.sharpe_ratio?.toFixed(2)}</td>
              <td>
                {c.volatility
                  ? (c.volatility * 100).toFixed(2) + "%"
                  : "—"}
              </td>
              <td>{c.max_drawdown_pct?.toFixed(2)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
              }
