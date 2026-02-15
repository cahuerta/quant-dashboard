import { useEffect, useState } from "react";
import "../styles/global.css";

const API = import.meta.env.VITE_API_URL;

export default function Global() {
  const [market, setMarket] = useState(null);
  const [capital, setCapital] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const m = await fetch(`${API}/dashboard/market-context`);
        const c = await fetch(`${API}/trading/state`);

        const marketJson = await m.json();
        const capitalJson = await c.json();

        setMarket(marketJson);
        setCapital(capitalJson);
      } catch (e) {
        console.error("Global load error", e);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return <div className="global-loading">Calculando estado global...</div>;
  }

  return (
    <div className="global-container">

      {/* HEADER */}
      <div className="global-header">
        <h1>Global System Overview</h1>
        <div className="global-mode">
          <span>Market Mode</span>
          <strong>{market?.market_mode}</strong>
        </div>
      </div>

      {/* KPI GRID */}
      <div className="global-grid">

        <Card
          title="Portfolio Value"
          value={`$${capital?.total_value ?? "—"}`}
        />

        <Card
          title="Volatility"
          value={`${(capital?.volatility_annual * 100)?.toFixed(2)}%`}
        />

        <Card
          title="VaR 95%"
          value={`${(capital?.var_95_annual * 100)?.toFixed(2)}%`}
        />

        <Card
          title="Expected Shortfall"
          value={`${(capital?.expected_shortfall_95_annual * 100)?.toFixed(2)}%`}
        />

        <Card
          title="Beta vs SPY"
          value={capital?.beta_vs_spy}
        />

        <Card
          title="Confidence"
          value={market?.confidence}
        />

      </div>

    </div>
  );
}

function Card({ title, value }) {
  return (
    <div className="global-card">
      <div className="global-card-title">{title}</div>
      <div className="global-card-value">{value ?? "—"}</div>
    </div>
  );
}
