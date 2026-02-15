import { useEffect, useState } from "react";

const API = "https://spy-2w-price-prediction.onrender.com";

export default function Signals() {
  const [signals, setSignals] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API}/signals`);
        if (!res.ok) throw new Error("signals error");
        const json = await res.json();
        setSignals(json.signals || []);
      } catch (err) {
        setError(err.message);
      }
    }

    load();
  }, []);

  if (error) return <div>Error: {error}</div>;
  if (!signals.length) return <div>No signals.</div>;

  return (
    <div className="page">
      <h1>Signals</h1>
      <table className="table">
        <thead>
          <tr>
            <th>Ticker</th>
            <th>Confidence</th>
            <th>Recommendation</th>
          </tr>
        </thead>
        <tbody>
          {signals.map((s) => (
            <tr key={s.ticker}>
              <td>{s.ticker}</td>
              <td>{s.confidence}</td>
              <td>{s.recommendation}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
