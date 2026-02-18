import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL;

export default function Portfolio() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setError(null);
        setLoading(true);

        // ✅ ENDPOINT REAL (EXISTE EN broker.py)
        const res = await fetch(`${API}/trading/status`, {
          cache: "no-store",
          headers: { Accept: "application/json" },
        });

        // Si falla, mostramos error pero SIN romper el render
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(`HTTP ${res.status} ${txt}`.trim());
        }

        const json = await res.json();
        if (!alive) return;
        setData(json);
      } catch (err) {
        console.error("Portfolio load error:", err);
        if (!alive) return;
        setError(err?.message || "No se pudo cargar el portafolio");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return <div className="global-loading">Cargando Portafolio...</div>;
  }

  // ✅ Si hay error, igual renderizamos el layout (enterprise), con mensaje
  if (error) {
    return (
      <div className="global-container">
        <div className="global-header">
          <h1>Portafolio</h1>
        </div>
        <div className="global-loading">Error: {error}</div>
      </div>
    );
  }

  // ✅ Si no hay data, render seguro
  if (!data) {
    return (
      <div className="global-container">
        <div className="global-header">
          <h1>Portafolio</h1>
        </div>
        <div className="global-loading">No hay datos disponibles.</div>
      </div>
    );
  }

  const badge = (ok) => (
    <span className={`badge ${ok ? "badge-success" : "badge-danger"}`}>
      {ok ? "OK" : "ALERTA"}
    </span>
  );

  return (
    <div className="global-container">
      <div className="global-header">
        <h1>Portafolio</h1>
      </div>

      <div className="global-grid">
        <Card
          title="Estado"
          value={
            data.status ? (
              <span className="badge badge-accent">{String(data.status)}</span>
            ) : (
              "—"
            )
          }
        />

        <Card
          title="Equity (USD)"
          value={
            data.equity != null
              ? `$${Number(data.equity).toLocaleString()}`
              : "—"
          }
        />

        <Card
          title="Buying Power (USD)"
          value={
            data.buying_power != null
              ? `$${Number(data.buying_power).toLocaleString()}`
              : "—"
          }
        />

        <Card
          title="Posiciones"
          value={data.positions != null ? String(data.positions) : "—"}
        />

        <Card
          title="Paper Trading"
          value={data.paper != null ? badge(Boolean(data.paper)) : "—"}
        />

        <Card
          title="Trading Blocked"
          value={
            data.trading_blocked != null
              ? badge(!Boolean(data.trading_blocked))
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
