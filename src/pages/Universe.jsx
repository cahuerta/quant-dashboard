import { useEffect, useState } from "react";

const API = "https://spy-2w-price-prediction.onrender.com";

export default function Universe() {
  const [tickers, setTickers] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API}/dashboard/tickers`);
        if (!res.ok) throw new Error("tickers error");
        const json = await res.json();
        setTickers(json.tickers || []);
      } catch (err) {
        setError(err.message);
      }
    }

    load();
  }, []);

  if (error) return <div>Error: {error}</div>;
  if (!tickers.length) return <div>Loading universe...</div>;

  return (
    <div className="page">
      <h1>Universe</h1>
      <table className="table">
        <thead>
          <tr>
            <th>Ticker</th>
          </tr>
        </thead>
        <tbody>
          {tickers.map((t) => (
            <tr key={t}>
              <td>{t}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
