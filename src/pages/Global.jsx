import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL;

export default function Global() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API}/dashboard/performance`);
        const json = await res.json();
        setData(json);
      } catch (e) {
        console.error("Performance load error", e);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return <div className="global-loading">Loading performance...</div>;
  }

  return (
    <div className="global-container">
      <div className="global-header">
        <h1>Global Performance</h1>
      </div>

      <div className="global-summary">

        <SummaryCard
          label="Equity"
          value={`$${data?.equity?.toLocaleString() ?? "—"}`}
        />

        <SummaryCard
          label="Total Return"
          value={
            data?.total_return_pct != null
              ? `${data.total_return_pct}%`
              : "—"
          }
          positive={data?.total_return_pct >= 0}
        />

        <SummaryCard
          label="Drawdown"
          value={
            data?.drawdown_pct != null
              ? `${data.drawdown_pct}%`
              : "—"
          }
          negative={data?.drawdown_pct < 0}
        />

        <SummaryCard
          label="High Water Mark"
          value={`$${data?.high_water_mark?.toLocaleString() ?? "—"}`}
        />

      </div>
    </div>
  );
}

function SummaryCard({ label, value, positive, negative }) {
  let className = "summary-card";

  if (positive) className += " positive";
  if (negative) className += " negative";

  return (
    <div className={className}>
      <div className="summary-label">{label}</div>
      <div className="summary-value">{value}</div>
    </div>
  );
}
