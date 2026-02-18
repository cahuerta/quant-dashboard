import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

const API = import.meta.env.VITE_API_URL;
const PIPELINE_KEY = import.meta.env.VITE_PIPELINE_KEY;

// =========================
// 🎨 COLORES
// =========================
function colorRetorno(v) {
  if (v == null) return "#94a3b8";
  return v > 0 ? "#22c55e" : v < 0 ? "#ef4444" : "#94a3b8";
}

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

function isExecutableByBroker(ticker) {
  return ticker && !ticker.toUpperCase().endsWith(".SN");
}

// =========================
// COMPONENT
// =========================
export default function Universe() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

        // 1️⃣ TICKERS
        const tRes = await fetch(`${API}/dashboard/tickers`);
        if (!tRes.ok) throw new Error("Tickers error");
        const tickers = (await tRes.json()).tickers || [];

        // 2️⃣ ALPHA SNAPSHOT
        const aRes = await fetch(`${API}/alpha`);
        const alphaJson = aRes.ok ? await aRes.json() : {};
        const alphaMap = alphaJson?.results || {};

        // 3️⃣ SIGNALS (confianza)
        const sRes = await fetch(`${API}/signals`);
        const sJson = sRes.ok ? await sRes.json() : {};
        const signalsMap = {};

        if (Array.isArray(sJson.signals)) {
          sJson.signals.forEach((s) => {
            if (!s.error && s.ticker) {
              signalsMap[s.ticker] = s.confidence ?? null;
            }
          });
        }

        // 4️⃣ POSICIONES
        let positions = {};
        if (PIPELINE_KEY) {
          const pRes = await fetch(`${API}/internal/positions`, {
            headers: { "X-PIPELINE-KEY": PIPELINE_KEY },
          });
          positions = pRes.ok ? await pRes.json() : {};
        }

        // 5️⃣ LATEST
        const results = await Promise.all(
          tickers.map(async (ticker) => {
            let retorno = null;

            try {
              const lRes = await fetch(`${API}/dashboard/latest/${ticker}`);
              if (lRes.ok) {
                const lJson = await lRes.json();
                retorno =
                  lJson?.latest?.prediction?.ret_ens_pct ?? null;
              }
            } catch {}

            const alpha = alphaMap?.[ticker]?.alpha_score ?? null;
            const confidence = signalsMap?.[ticker] ?? null;
            const positionValue =
              positions?.[ticker]?.market_value ?? 0;

            const executable =
              isExecutableByBroker(ticker) &&
              alpha != null &&
              alpha >= 0.55 &&
              confidence != null &&
              confidence >= 0.5;

            return {
              ticker,
              retorno,
              alpha,
              confidence,
              positionValue,
              executable,
            };
          })
        );

        // 🔥 ORDEN POR ALPHA REAL
        results.sort((a, b) => (b.alpha ?? -999) - (a.alpha ?? -999));

        setRows(results);
      } catch (err) {
        console.error(err);
        setError("Error cargando Universe");
      } finally {
        setLoading(false);
      }
    }

    loadUniverse();
  }, []);

  const subtitle = useMemo(() => {
    const exec = rows.filter((r) => r.executable).length;
    return `Activos: ${rows.length} | Ejecutables: ${exec}`;
  }, [rows]);

  if (loading) return <div className="global-loading">Cargando...</div>;
  if (error) return <div className="global-loading">{error}</div>;

  return (
    <div className="global-container">
      <div className="global-header">
        <div>
          <h1>Universe Institucional</h1>
          <div style={{ color: "#94a3b8" }}>{subtitle}</div>
        </div>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Activo</th>
            <th>Retorno</th>
            <th>Alpha</th>
            <th>Confianza</th>
            <th>Posición</th>
            <th>Ejecutable</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((r) => (
            <tr key={r.ticker}>
              {/* 1️⃣ NOMBRE PRIMERO */}
              <td>
                <Link
                  to={`/analysis?ticker=${r.ticker}`}
                  style={{
                    color: "#38bdf8",
                    fontWeight: 700,
                    textDecoration: "none",
                  }}
                >
                  {r.ticker}
                </Link>
              </td>

              <td style={{ color: colorRetorno(r.retorno), fontWeight: 700 }}>
                {r.retorno != null
                  ? r.retorno.toFixed(2) + "%"
                  : "—"}
              </td>

              <td style={{ color: colorAlpha(r.alpha), fontWeight: 800 }}>
                {r.alpha != null ? r.alpha.toFixed(3) : "—"}
              </td>

              <td style={{ color: colorConf(r.confidence), fontWeight: 700 }}>
                {r.confidence != null
                  ? r.confidence.toFixed(2)
                  : "—"}
              </td>

              <td>
                {r.positionValue > 0
                  ? "$" + r.positionValue.toFixed(0)
                  : "—"}
              </td>

              <td style={{ fontWeight: 800 }}>
                {r.executable ? "✅" : "❌"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {!PIPELINE_KEY && (
        <div style={{ marginTop: 12, color: "#eab308" }}>
          ⚠️ Sin VITE_PIPELINE_KEY → Posición no visible
        </div>
      )}
    </div>
  );
          }
