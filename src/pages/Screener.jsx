import { useEffect, useState, useMemo } from "react";

const API = import.meta.env.VITE_API_URL;

export default function Screener() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API}/dashboard/screener`);
        if (!res.ok) throw new Error("Screener endpoint error");

        const json = await res.json();

        if (!Array.isArray(json.candidates)) {
          throw new Error("Formato inválido de screener");
        }

        setCandidates(json.candidates);
      } catch (err) {
        console.error("Screener load error:", err);
        setError("No se pudo cargar screener");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  // 🔹 Ordenados por score descendente
  const sorted = useMemo(() => {
    return [...candidates].sort((a, b) => {
      const sa = Number(a.score ?? -Infinity);
      const sb = Number(b.score ?? -Infinity);
      return sb - sa;
    });
  }, [candidates]);

  const top20 = sorted.slice(0, 20);

  if (loading) {
    return <div className="global-loading">Cargando Screener...</div>;
  }

  if (error) {
    return <div className="global-loading">{error}</div>;
  }

  if (!sorted.length) {
    return (
      <div className="global-loading">
        No hay candidatos disponibles.
      </div>
    );
  }

  return (
    <div className="global-container">
      <div className="global-header">
        <h1>Screener Cuantitativo</h1>
      </div>

      {/* ================= TOP 20 ================= */}
      <SectionTable title="Top 20" data={top20} />

      {/* ================= TODOS ================= */}
      <SectionTable title="Todos los candidatos" data={sorted} />
    </div>
  );
}

function SectionTable({ title, data }) {
  return (
    <div style={{ marginBottom: "60px" }}>
      <h2 style={{ marginBottom: "20px" }}>{title}</h2>

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
          {data.map((c, index) => (
            <tr key={c.ticker || index}>
              <td>{index + 1}</td>
              <td>{c.ticker}</td>
              <td>{c.score?.toFixed?.(2) ?? "—"}</td>
              <td>{c.rsi?.toFixed?.(2) ?? "—"}</td>
              <td>{c.sharpe?.toFixed?.(2) ?? "—"}</td>
              <td>{c.beta?.toFixed?.(2) ?? "—"}</td>
              <td>
                {c.volatility != null
                  ? (c.volatility * 100).toFixed(2) + "%"
                  : "—"}
              </td>
              <td>
                {c.trend_3m != null
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
