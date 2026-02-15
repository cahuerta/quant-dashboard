import { useEffect, useState } from "react";

const API = "https://spy-2w-price-prediction.onrender.com";

export default function Dashboard() {
  const [market, setMarket] = useState(null);
  const [signals, setSignals] = useState([]);
  const [screener, setScreener] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [m, s, sc] = await Promise.all([
          fetch(`${API}/dashboard/market-context`).then(r => r.json()),
          fetch(`${API}/signals`).then(r => r.json()),
          fetch(`${API}/screener`).then(r => r.json())
        ]);

        setMarket(m);
        setSignals(s?.signals || []);
        setScreener(sc?.candidates || []);
      } catch (e) {
        console.error("Dashboard load error:", e);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return <div className="loading-block">Loading dashboard...</div>;
  }

  return (
    <div className="dashboard-container">

      {/* ================= MARKET ================= */}
      <section className="block">
        <h2>Market Context</h2>
        <div className="block-grid">
          <div className="metric">
            <span>Mode</span>
            <strong>{market?.market_mode || "—"}</strong>
          </div>
          <div className="metric">
            <span>Confidence</span>
            <strong>{market?.confidence || "—"}</strong>
          </div>
          <div className="metric">
            <span>Reason</span>
            <strong>{market?.reason || "—"}</strong>
          </div>
        </div>
      </section>

      {/* ================= SIGNALS ================= */}
      <section className="block">
        <h2>Active Signals</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Ticker</th>
              <th>Recommendation</th>
              <th>Return %</th>
              <th>Confidence</th>
            </tr>
          </thead>
          <tbody>
            {signals.length === 0 && (
              <tr>
                <td colSpan="4">No active signals</td>
              </tr>
            )}
            {signals.map(s => (
              <tr key={s.ticker}>
                <td>{s.ticker}</td>
                <td>{s.recommendation}</td>
                <td>{s.ret_ens_pct?.toFixed(2)}%</td>
                <td>{s.confidence}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* ================= SCREENER ================= */}
      <section className="block">
        <h2>Screener Candidates</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Ticker</th>
              <th>Score</th>
              <th>RSI</th>
              <th>Sharpe</th>
              <th>Beta</th>
            </tr>
          </thead>
          <tbody>
            {screener.length === 0 && (
              <tr>
                <td colSpan="5">No candidates</td>
              </tr>
            )}
            {screener.slice(0, 10).map(s => (
              <tr key={s.ticker}>
                <td>{s.ticker}</td>
                <td>{s.score?.toFixed(2)}</td>
                <td>{s.rsi?.toFixed(2)}</td>
                <td>{s.sharpe?.toFixed(2)}</td>
                <td>{s.beta?.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

    </div>
  );
}
