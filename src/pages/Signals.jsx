import { useEffect, useState } from "react";

const API = "https://spy-2w-price-prediction.onrender.com";

// =========================
// 🎨 COLORES
// =========================
function colorConfianza(v) {
  if (v == null) return "#94a3b8";
  if (v >= 0.70) return "#22c55e";
  if (v >= 0.55) return "#eab308";
  return "#ef4444";
}

function interpretarCalidad(q) {
  if (!q) return "—";
  if (q.includes("STRONG")) return "🔥 Alta";
  if (q.includes("GOOD")) return "✅ Buena";
  if (q.includes("WEAK")) return "⚠️ Débil";
  return "❌ Ruido";
}

function interpretarRecomendacion(rec) {
  if (!rec) return "—";

  const r = rec.toUpperCase();

  if (r.includes("BUY")) return "🟢 Comprar";
  if (r.includes("SELL")) return "🔴 Vender";
  if (r.includes("HOLD")) return "🟡 Mantener";

  return rec;
}

// =========================
// COMPONENTE
// =========================
export default function Signals() {
  const [signals, setSignals] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API}/signals`, {
          cache: "no-store"
        });

        if (!res.ok) throw new Error("Error cargando señales");

        const json = await res.json();

        const sorted = (json.signals || [])
          .filter(s => !s.error)
          .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));

        setSignals(sorted);

      } catch (err) {
        setError(err.message);
      }
    }

    load();
  }, []);

  if (error)
    return <div className="global-loading">Error: {error}</div>;

  if (!signals.length)
    return <div className="global-loading">No hay señales disponibles.</div>;

  return (
    <div className="global-container">
      <div className="global-header">
        <h1>Señales del Sistema</h1>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>#</th>
            <th>Activo</th>
            <th title="Nivel de confianza estadística del modelo">
              Confianza
            </th>
            <th title="Calidad histórica de la señal">
              Calidad
            </th>
            <th title="Acción sugerida por el modelo">
              Acción Sugerida
            </th>
          </tr>
        </thead>

        <tbody>
          {signals.map((s, index) => (
            <tr key={s.ticker}>
              <td>{index + 1}</td>

              <td>
                <strong>{s.ticker}</strong>
              </td>

              <td
                style={{
                  color: colorConfianza(s.confidence),
                  fontWeight: 700
                }}
              >
                {s.confidence?.toFixed(3)}
              </td>

              <td style={{ fontWeight: 600 }}>
                {interpretarCalidad(s.quality)}
              </td>

              <td style={{ fontWeight: 700 }}>
                {interpretarRecomendacion(s.recommendation)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
