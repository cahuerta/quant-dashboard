import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL;

// =========================
// 🌍 BANDERA por sufijo
// =========================
function getFlag(ticker) {
  if (!ticker) return "🌐";
  const t = ticker.toUpperCase();
  if (t.endsWith(".SN") || t.endsWith(".SCL")) return "🇨🇱";
  if (t.endsWith(".MC"))                        return "🇪🇸";
  if (t.endsWith(".DE") || t.endsWith(".XETRA")) return "🇩🇪";
  if (t.endsWith(".PA"))                        return "🇫🇷";
  if (t.endsWith(".AS"))                        return "🇳🇱";
  if (t.endsWith(".SW"))                        return "🇨🇭";
  if (t.endsWith(".TO"))                        return "🇨🇦";
  if (t.endsWith(".L"))                         return "🇬🇧";
  return "🇺🇸";
}

// =========================
// 🎨 COLORES
// =========================
function colorScore(v) {
  if (v == null) return "#94a3b8";
  if (v >= 0.75) return "#16a34a";
  if (v >= 0.70) return "#22c55e";
  if (v >= 0.55) return "#eab308";
  return "#ef4444";
}
function colorMomentum(v) {
  if (v == null) return "#94a3b8";
  if (v >= 15) return "#22c55e";
  if (v >= 5)  return "#eab308";
  return "#ef4444";
}
function colorSharpe(v) {
  if (v == null) return "#94a3b8";
  if (v >= 2) return "#22c55e";
  if (v >= 1) return "#eab308";
  return "#ef4444";
}
function colorRSI(v) {
  if (v == null) return "#94a3b8";
  if (v >= 70) return "#ef4444";
  if (v <= 30) return "#22c55e";
  return "#94a3b8";
}
function colorDrawdown(v) {
  if (v == null) return "#94a3b8";
  if (v >= -5)  return "#22c55e";
  if (v >= -10) return "#eab308";
  return "#ef4444";
}

// =========================
// COMPONENTE PRINCIPAL
// =========================
export default function Screener() {
  const [strict,  setStrict]  = useState([]);
  const [top20,   setTop20]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API}/dashboard/screener`, { cache: "no-store" });
        if (!res.ok) throw new Error("Error endpoint Screener");
        const json = await res.json();

        setStrict(
          (json.candidates_strict || [])
            .sort((a, b) => b.score - a.score)
            .slice(0, 15)
        );
        setTop20(
          (json.top20_global || [])
            .sort((a, b) => b.score - a.score)
            .slice(0, 20)
        );
      } catch (err) {
        console.error(err);
        setError("No se pudo cargar Screener");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="global-loading">Cargando Screener...</div>;
  if (error)   return <div className="global-loading">{error}</div>;

  return (
    <div className="global-container">
      <div className="global-header">
        <h1>Screener</h1>
      </div>
      <Section title="🔥 Alta Convicción (Strict)" data={strict} />
      <Section title="🌎 Top 20 Global"             data={top20}  />
    </div>
  );
}

// =========================
// SECCIÓN
// =========================
function Section({ title, data }) {
  if (!data.length) {
    return <div className="global-loading">Sin datos para {title}</div>;
  }

  return (
    <>
      <h2 style={{ marginTop: 40 }}>{title}</h2>

      <table className="table screener-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Activo</th>
            <th title="Score cuantitativo total del modelo">Score</th>
            <th title="Retorno acumulado últimos 3 meses">Momentum 3M</th>
            <th title="Retorno ajustado por riesgo">Sharpe</th>
            <th title="Indicador técnico sobrecompra/sobreventa">RSI</th>
            <th title="Peor caída reciente del activo">Drawdown Máx</th>
          </tr>
        </thead>

        <tbody>
          {data.map((c, index) => {
            const isTop3  = index < 3;
            const isElite = c.score >= 0.75;

            return (
              <tr
                key={`${c.ticker}-${index}`}
                style={{
                  backgroundColor: isTop3
                    ? "rgba(34,197,94,0.06)"
                    : "transparent",
                }}
              >
                <td style={{ fontWeight: isTop3 ? 800 : 500 }}>
                  {index + 1}
                </td>

                {/* Ticker + bandera inline */}
                <td>
                  <strong>
                    {c.ticker}
                    <span style={{ marginLeft: 6, fontSize: "1rem" }}>
                      {getFlag(c.ticker)}
                    </span>
                    {isElite && " 🔥"}
                  </strong>
                </td>

                <td style={{ color: colorScore(c.score), fontWeight: 800 }}>
                  {c.score?.toFixed(3)}
                </td>

                <td style={{ color: colorMomentum(c.trend_3m_pct), fontWeight: 600 }}>
                  {c.trend_3m_pct?.toFixed(2)}%
                </td>

                <td style={{ color: colorSharpe(c.sharpe_ratio), fontWeight: 600 }}>
                  {c.sharpe_ratio?.toFixed(2)}
                </td>

                <td style={{ color: colorRSI(c.rsi_wilder), fontWeight: 600 }}>
                  {c.rsi_wilder?.toFixed(1)}
                </td>

                <td style={{ color: colorDrawdown(c.max_drawdown_pct), fontWeight: 600 }}>
                  {c.max_drawdown_pct?.toFixed(2)}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
            }
