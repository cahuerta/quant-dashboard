import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

const API = import.meta.env.VITE_API_URL;

// =========================
// 🎨 COLORES
// =========================
function colorAlpha(a) {
  if (a == null) return "#94a3b8";
  if (a >= 0.70) return "#16a34a";
  if (a >= 0.55) return "#eab308";
  return "#ef4444";
}

function colorConf(c) {
  if (c == null) return "#94a3b8";
  if (c >= 0.75) return "#16a34a";
  if (c >= 0.50) return "#eab308";
  return "#ef4444";
}

function reasonLabel(reason) {
  if (!reason) return "—";
  const map = {
    alpha_below_threshold:    "Alpha bajo threshold",
    liquidity_gate_triggered: "Liquidez insuficiente",
    kill_switch:              "Kill switch",
    kill_switch_close:        "Cerrar posición",
    kill_switch_no_open:      "Kill switch",
    no_alpha:                 "Sin alpha",
  };
  return map[reason] || reason;
}

// =========================
// COMPONENT
// =========================
export default function UniverseChile() {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (!API) {
      setError("Falta VITE_API_URL");
      setLoading(false);
      return;
    }

    async function loadUniverse() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`${API}/dashboard/universe`, { cache: "no-store" });
        if (!res.ok) throw new Error("Universe error");

        const json = await res.json();
        setRows(json?.rows || []);
      } catch (err) {
        console.error(err);
        setError("Error cargando Universe Chile");
      } finally {
        setLoading(false);
      }
    }

    loadUniverse();
  }, []);

  // 🇨🇱 Solo tickers .SN / .CL
  const chileanRows = useMemo(() =>
    rows.filter(r => r.ticker.endsWith(".SN") || r.ticker.endsWith(".CL")),
  [rows]);

  const subtitle = useMemo(() => {
    const exec = chileanRows.filter((r) => r.executable).length;
    return `Activos Chile: ${chileanRows.length} | Ejecutables: ${exec}`;
  }, [chileanRows]);

  if (loading) return <div className="global-loading">Cargando Mercado Local...</div>;
  if (error)   return <div className="global-loading">{error}</div>;

  return (
    <div className="global-container">

      <div className="global-header">
        <div>
          <h1>Universe Chile 🇨🇱</h1>
          <div style={{ color: "#94a3b8" }}>{subtitle}</div>
        </div>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Activo</th>
            <th>Alpha</th>
            <th>Confianza</th>
            <th>Posición</th>
            <th>Ejecutable</th>
            <th>Motivo</th>
          </tr>
        </thead>
        <tbody>
          {chileanRows.map((r) => (
            <tr key={r.ticker}>

              <td>
                <Link
                  to={`/analysis?ticker=${r.ticker}`}
                  style={{ color: "#fbbf24", fontWeight: 700, textDecoration: "none" }}
                >
                  {r.ticker}
                </Link>
              </td>

              <td style={{ fontWeight: 800 }}>
                {r.alpha != null ? (
                  <span style={{ color: colorAlpha(r.alpha) }}>
                    {r.alpha.toFixed(3)}
                  </span>
                ) : "—"}
              </td>

              <td style={{ color: colorConf(r.confidence), fontWeight: 700 }}>
                {r.confidence != null ? r.confidence.toFixed(2) : "—"}
              </td>

              <td>
                {r.positionValue > 0
                  ? "$" + r.positionValue.toLocaleString("es-CL")
                  : "—"}
              </td>

              <td style={{ fontWeight: 800 }}>
                {r.executable ? "✅" : "❌"}
              </td>

              <td style={{ color: "#94a3b8" }}>
                {reasonLabel(r.block_reason)}
              </td>

            </tr>
          ))}
        </tbody>
      </table>

      {chileanRows.length === 0 && (
        <div style={{ textAlign: "center", padding: "20px", color: "#94a3b8" }}>
          No se encontraron activos chilenos en el Universe actual.
        </div>
      )}

    </div>
  );
}
