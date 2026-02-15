import { useEffect, useState } from "react";

const API = "https://spy-2w-price-prediction.onrender.com";

export default function Market() {
  const [data, setData] = useState(null);
  const [portfolio, setPortfolio] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const marketRes = await fetch(`${API}/dashboard/market-context`);
        const portfolioRes = await fetch(`${API}/portfolio/summary`);

        if (!marketRes.ok) throw new Error("market-context error");
        if (!portfolioRes.ok) throw new Error("portfolio error");

        const marketJson = await marketRes.json();
        const portfolioJson = await portfolioRes.json();

        setData(marketJson);
        setPortfolio(portfolioJson);
      } catch (err) {
        setError(err.message);
      }
    }

    load();
  }, []);

  if (error) return <div className="error">Error: {error}</div>;
  if (!data) return <div className="loading">Loading market...</div>;

  return (
    <div className="page">
      <h1>Market Overview</h1>

      <div className="grid">
        <Card title="Market Mode" value={data.market_mode} />
        <Card title="Confidence" value={data.confidence} />
        <Card title="Reason" value={data.reason} />
        <Card title="Portfolio Value" value={portfolio?.total_value ?? "—"} />
        <Card title="Volatility" value={portfolio?.volatility_annual ?? "—"} />
        <Card title="VaR 95%" value={portfolio?.var_95_annual ?? "—"} />
        <Card title="Expected Shortfall" value={portfolio?.expected_shortfall_95_annual ?? "—"} />
        <Card title="Beta vs SPY" value={portfolio?.beta_vs_spy ?? "—"} />
      </div>
    </div>
  );
}

function Card({ title, value }) {
  return (
    <div className="card">
      <div className="card-title">{title}</div>
      <div className="card-value">{value ?? "—"}</div>
    </div>
  );
}
