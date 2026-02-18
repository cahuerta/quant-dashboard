import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

const API = import.meta.env.VITE_API_URL;
const PIPELINE_KEY = import.meta.env.VITE_PIPELINE_KEY;

// =========================
// helpers UI
// =========================
function colorRetorno(v) {
  if (v == null) return "#94a3b8";
  return v > 0 ? "#22c55e" : v < 0 ? "#ef4444" : "#94a3b8";
}

function colorAlpha(a) {
  if (a == null) return "#94a3b8";
  if (a >= 0.70) return "#16a34a";   // alta
  if (a >= 0.55) return "#eab308";   // media
  return "#ef4444";                 // baja
}

function colorConf(c) {
  if (c == null) return "#94a3b8";
  if (c >= 0.75) return "#16a34a";  // alta
  if (c >= 0.50) return "#eab308";  // media
  return "#ef4444";                // baja
}

function isExecutableByBroker(ticker) {
  return ticker && !ticker.toUpperCase().endsWith(".SN"); // broker bloquea .SN
}

// =========================
// component
// =========================
export default function Universe() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!API) {
      setError("Falta VITE_API_URL en el frontend");
      setLoading(false);
      return;
    }

    async function loadUniverse() {
      setLoading(true);
      setError(null);

      try {
        // 1) tickers
        const tRes = await fetch(`${API}/dashboard/tickers`, {
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        if (!tRes.ok) throw new Error(`Tickers HTTP ${tRes.status}`);
        const tickers = (await tRes.json()).tickers || [];

        // 2) alpha snapshot
        const aRes = await fetch(`${API}/alpha`, {
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        const alphaJson = aRes.ok ? await aRes.json() : {};
        const alphaMap = alphaJson?.results || {};

        // 3) signals (confianza)
        const sRes = await fetch(`${API}/signals`, {
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        const sJson = sRes.ok ? await sRes.json() : {};
        const signalsMap = {};
        if (Array.isArray(sJson.signals)) {
          sJson.signals.forEach((s) => {
            if (!s?.error && s?.ticker) {
              signalsMap[s.ticker] = {
                confidence: s.confidence ?? null,
                // si quieres mostrar calidad del modelo desde signals, queda listo:
                model_ok: s.model_ok ?? null,
                acceptance: s.acceptance ?? s.model_acceptance ?? null,
              };
            }
          });
        }

        // 4) posiciones (protegido)
        let positions = {};
        if (PIPELINE_KEY) {
          const pRes = await fetch(`${API}/internal/positions`, {
            cache: "no-store",
            headers: {
              Accept: "application/json",
              "X-PIPELINE-KEY": PIPELINE_KEY,
            },
          });
          positions = pRes.ok ? await pRes.json() : {};
        } else {
          // sin key: no rompe, solo queda en 0
          positions = {};
        }

        // 5) latest por ticker (N llamadas)
        const settled = await Promise.allSettled(
          tickers.map(async (ticker) => {
            const out = {
              ticker,
              retorno: null,
              alpha: alphaMap?.[ticker]?.alpha_score ?? null,
              confidence: signalsMap?.[ticker]?.confidence ?? null,
              positionValue: positions?.[ticker]?.market_value ?? 0,
              executable: false,
            };

            try {
              const lRes = await fetch(`${API}/dashboard/latest/${ticker}`, {
                cache: "no-store",
                headers: { Accept: "application/json" },
              });

              if (lRes.ok) {
                const lJson = await lRes.json();
                const pred = lJson?.latest?.prediction;
                out.retorno = pred?.ret_ens_pct ?? null; // retorno del modelo
              } else {
                // latest falló: dejamos retorno en null, pero no botamos la tabla
                console.warn(`latest ${ticker} HTTP ${lRes.status}`);
              }
            } catch (e) {
              console.warn(`latest ${ticker} fail`, e);
            }

            // ejecutable (aprox) = pasa broker + umbrales
            out.executable =
              isExecutableByBroker(ticker) &&
              out.alpha != null &&
              out.alpha >= 0.55 &&
              out.confidence != null &&
              out.confidence >= 0.5;

            return out;
          })
        );

        const list = settled
          .map((r) => (r.status === "fulfilled" ? r.value : null))
          .filter(Boolean);

        // orden: alpha desc, null al final
        list.sort((a, b) => (b.alpha ?? -999) - (a.alpha ?? -999));

        setRows(list);
      } catch (e) {
        console.error("Universe load error:", e);
        setError(e.message || "No se pudo cargar Universe");
      } finally {
        setLoading(false);
      }
    }

    loadUniverse();
  }, []);

  const subtitle = useMemo(() => {
    const n = rows.length;
    const exec = rows.filter((r) => r.executable).length;
    return n ? `Activos: ${n} | Ejecutables: ${exec}` : "";
  }, [rows]);

  if (loading) return <div className="global-loading">Cargando Universo...</div>;
  if (error) return <div className="global-loading">{error}</div>;

  return (
    <div className="global-container">
      <div className="global-header">
        <div>
          <h1>Universo</h1>
          <div style={{ color: "#94a3b8", marginTop: 6 }}>{subtitle}</div>
        </div>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Retorno</th>
            <th>Alfa</th>
            <th>Confianza</th>
            <th>Posición</th>
            <th>Ejecutable</th>
            <th>Activo</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((r) => (
            <tr key={r.ticker}>
              {/* 1) Retorno */}
              <td style={{ color: colorRetorno(r.retorno), fontWeight: 700 }}>
                {r.retorno != null ? `${r.retorno.toFixed(2)}%` : "—"}
              </td>

              {/* 2) Alpha */}
              <td style={{ color: colorAlpha(r.alpha), fontWeight: 800 }}>
                {r.alpha != null ? r.alpha.toFixed(3) : "—"}
              </td>

              {/* 3) Confianza */}
              <td style={{ color: colorConf(r.confidence), fontWeight: 700 }}>
                {r.confidence != null ? r.confidence.toFixed(2) : "—"}
              </td>

              {/* 4) Posición */}
              <td style={{ fontWeight: 600 }}>
                {r.positionValue > 0 ? `$${Number(r.positionValue).toFixed(0)}` : "—"}
              </td>

              {/* 5) Ejecutable */}
              <td style={{ fontWeight: 800 }}>
                {r.executable ? "✅" : "❌"}
              </td>

              {/* Activo (link) */}
              <td>
                <Link
                  to={`/analysis?ticker=${r.ticker}`}
                  style={{ color: "#38bdf8", fontWeight: 700, textDecoration: "none" }}
                >
                  {r.ticker}
                </Link>
                {!isExecutableByBroker(r.ticker) && (
                  <div style={{ fontSize: 12, color: "#ef4444", marginTop: 4 }}>
                    No ejecutable (.SN)
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {!PIPELINE_KEY && (
        <div style={{ marginTop: 14, color: "#eab308", fontWeight: 600 }}>
          ⚠️ Sin VITE_PIPELINE_KEY: la columna “Posición” queda en “—”.
        </div>
      )}
    </div>
  );
}
