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
        const res = await fetch(`${API}/dashboard/screener`, {
          cache: "no-store"
        });

        if (!res.ok) throw new Error("Error endpoint Screener");

        const json = await res.json();

        setStrict(
          (json.candidates_strict || [])
            .sort((a, b) => b.score - a.score)
            .slice(0, 15)
        );

        setTop20(
          (json.top20_global || [])
            .sort((a, b) => b.score - a.score)
            .slice(0, 20)
        );

      } catch (err) {
        console.error(err);
        setError("No se pudo cargar Screener");
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

      <Section title="🔥 Alta Convicción (Strict)" data={strict} />
      <Section title="🌎 Top 20 Global" data={top20} />
    </div>
  );
}

function Section({ title, data }) {
  if (!data.length) {
    return <div className="global-loading">Sin datos para {title}</div>;
  }

  return (
    <>
      <h2 style={{ marginTop: 40 }}>{title}</h2>

      <table className="table screener-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Activo</th>
            <th>Score</th>
            <th>Tendencia 3M</th>
            <th>Sharpe</th>
            <th>RSI</th>
            <th>Drawdown Máx</th>
          </tr>
        </thead>
        <tbody>
          {data.map((c, index) => (
            <tr key={`${c.ticker}-${index}`}>
              <td>{index + 1}</td>
              <td><strong>{c.ticker}</strong></td>
              <td>{c.score?.toFixed(3)}</td>
              <td>{c.trend_3m_pct?.toFixed(2)}%</td>
              <td>{c.sharpe_ratio?.toFixed(2)}</td>
              <td
                style={{
                  color:
                    c.rsi_wilder > 70
                      ? "#ff5c5c"
                      : c.rsi_wilder < 30
                      ? "#4cd964"
                      : "inherit"
                }}
              >
                {c.rsi_wilder?.toFixed(1)}
              </td>
              <td>{c.max_drawdown_pct?.toFixed(2)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
