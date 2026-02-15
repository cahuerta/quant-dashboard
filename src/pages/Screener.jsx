import { useEffect, useMemo, useState } from "react";

const API = import.meta.env.VITE_API_URL;

export default function Screener() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API}/dashboard/screener`);
        if (!res.ok) throw new Error("Screener endpoint error");

        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("Screener load error:", err);
        setError("No se pudo cargar screener");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const sortedCandidates = useMemo(() => {
    if (!data || !Array.isArray(data.candidates)) return [];

    return [...data.candidates].sort(
      (a, b) => (b.score || 0) - (a.score || 0)
    );
  }, [data]);

  const top20 = sortedCandidates.slice(0, 20);

  if (loading)
    return <div className="global-loading">Cargando Screener...</div>;

  if (error)
    return <div className="global-loading">{error}</div>;

  if (!sortedCandidates.length)
    return (
      <div className="global-loading">
        No hay datos de screener disponibles.
      </div>
    );

  return (
    <div className="global-container">
      <div className="global-header">
        <h1>Screener</h1>
      </div>

      {/* ================= TOP 20 ================= */}
      <h2 style={{ marginBottom: 20 }}>Top 20</h2>

      <table className="table" style={{ marginBottom: 60 }}>
        <thead>
          <tr>
            <th>#</th>
            <th>Ticker</th>
            <th>Score</th>
            <th>RSI</th>
            <th>Sharpe</th>
            <th>Beta</th>
            <th>Volatilidad</th>
            <th>Trend 3M</th>
          </tr>
        </thead>
        <tbody>
          {top20.map((c, index) => (
            <tr key={c.ticker || index}>
              <td>{index + 1}</td>
              <td><strong>{c.ticker}</strong></td>
              <td>{c.score?.toFixed?.(2) ?? "—"}</td>
              <td>{c.rsi?.toFixed?.(2) ?? "—"}</td>
              <td>{c.sharpe?.toFixed?.(2) ?? "—"}</td>
              <td>{c.beta?.toFixed?.(2) ?? "—"}</td>
              <td>
                {c.volatility
                  ? (c.volatility * 100).toFixed(2) + "%"
                  : "—"}
              </td>
              <td>
                {c.trend_3m
                  ? (c.trend_3m * 100).toFixed(2) + "%"
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ================= TODOS LOS CANDIDATOS ================= */}
      <h2 style={{ marginBottom: 20 }}>Todos los candidatos</h2>

      <table className="table">
        <thead>
          <tr>
            <th>#</th>
            <th>Ticker</th>
            <th>Score</th>
            <th>RSI</th>
            <th>Sharpe</th>
            <th>Beta</th>
            <th>Volatilidad</th>
            <th>Trend 3M</th>
          </tr>
        </thead>
        <tbody>
          {sortedCandidates.map((c, index) => (
            <tr key={c.ticker || index}>
              <td>{index + 1}</td>
              <td>{c.ticker}</td>
              <td>{c.score?.toFixed?.(2) ?? "—"}</td>
              <td>{c.rsi?.toFixed?.(2) ?? "—"}</td>
              <td>{c.sharpe?.toFixed?.(2) ?? "—"}</td>
              <td>{c.beta?.toFixed?.(2) ?? "—"}</td>
              <td>
                {c.volatility
                  ? (c.volatility * 100).toFixed(2) + "%"
                  : "—"}
              </td>
              <td>
                {c.trend_3m
                  ? (c.trend_3m * 100).toFixed(2) + "%"
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
            }
