import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL;

export default function Portfolio() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API}/trading/state`);

        if (!res.ok) {
          throw new Error("Portfolio endpoint error");
        }

        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("Portfolio load error:", err);
        setError("No se pudo cargar el portafolio");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return <div className="global-loading">Cargando Portafolio...</div>;
  }

  if (error) {
    return <div className="global-loading">{error}</div>;
  }

  if (!data) {
    return (
      <div className="global-loading">
        No hay datos disponibles.
      </div>
    );
  }

  return (
    <div className="global-container">
      <div className="global-header">
        <h1>Portafolio</h1>
      </div>

      <div className="global-grid">

        <Card
          title="Total Value"
          value={`$${data.total_value ?? "—"}`}
        />

        <Card
          title="Cash"
          value={`$${data.cash ?? "—"}`}
        />

        <Card
          title="Volatility (Annual)"
          value={
            data.volatility_annual
              ? (data.volatility_annual * 100).toFixed(2) + "%"
              : "—"
          }
        />

        <Card
          title="VaR 95%"
          value={
            data.var_95_annual
              ? (data.var_95_annual * 100).toFixed(2) + "%"
              : "—"
          }
        />

      </div>
    </div>
  );
}

function Card({ title, value }) {
  return (
    <div className="card">
      <div className="card-title">{title}</div>
      <div className="card-value">{value}</div>
    </div>
  );
}
