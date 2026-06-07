import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

const API = import.meta.env.VITE_API_URL;

// =========================
// 🌍 BANDERA + MERCADO por sufijo
// =========================
function getMarketInfo(ticker) {
  if (!ticker) return { flag: "🌐", market: "—" };
  const t = ticker.toUpperCase();
  if (t.endsWith(".SN") || t.endsWith(".SCL")) return { flag: "🇨🇱", market: "CL" };
  if (t.endsWith(".MC"))                        return { flag: "🇪🇸", market: "ES" };
  if (t.endsWith(".DE") || t.endsWith(".XETRA")) return { flag: "🇩🇪", market: "DE" };
  if (t.endsWith(".PA"))                        return { flag: "🇫🇷", market: "FR" };
  if (t.endsWith(".AS"))                        return { flag: "🇳🇱", market: "NL" };
  if (t.endsWith(".SW"))                        return { flag: "🇨🇭", market: "CH" };
  if (t.endsWith(".TO"))                        return { flag: "🇨🇦", market: "CA" };
  if (t.endsWith(".L"))                         return { flag: "🇬🇧", market: "UK" };
  return                                               { flag: "🇺🇸", market: "US" };
}

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
  if (!reason) return null;
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
// COLUMNA ESTADO UNIFICADA
// =========================
function EstadoCell({ executable, block_reason }) {
  if (executable) {
    return (
      <td style={{ fontWeight: 700, color: "#22c55e", whiteSpace: "nowrap" }}>
        ✅ Ejecutable
      </td>
    );
  }

  const causa = reasonLabel(block_reason);
  return (
    <td>
      <span style={{ fontWeight: 700, color: "#ef4444" }}>❌</span>
      {causa && (
        <div style={{ color: "#64748b", fontSize: "0.75rem", marginTop: 2 }}>
          {causa}
        </div>
      )}
    </td>
  );
}

// =========================
// ORDEN DE MERCADOS
// =========================
const MARKET_ORDER = ["US", "CL", "ES", "DE", "FR", "NL", "CH", "CA", "UK"];

// =========================
// COMPONENT
// =========================
export default function Universe() {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [groupBy, setGroupBy] = useState(false);

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
        setError("Error cargando Universe");
      } finally {
        setLoading(false);
      }
    }

    loadUniverse();
  }, []);

  const enriched = useMemo(() =>
    rows.map((r) => ({ ...r, ...getMarketInfo(r.ticker) })),
    [rows]
  );

  const subtitle = useMemo(() => {
    const exec    = enriched.filter((r) => r.executable).length;
    const markets = [...new Set(enriched.map((r) => r.flag))];
    return `Activos: ${enriched.length} | Ejecutables: ${exec} | Mercados: ${markets.join(" ")}`;
  }, [enriched]);

  const sorted = useMemo(() => {
    if (!groupBy) {
      return [...enriched].sort((a, b) => (b.alpha ?? -99) - (a.alpha ?? -99));
    }
    return [...enriched].sort((a, b) => {
      const mi = MARKET_ORDER.indexOf(a.market);
      const mj = MARKET_ORDER.indexOf(b.market);
      if (mi !== mj) return mi - mj;
      return (b.alpha ?? -99) - (a.alpha ?? -99);
    });
  }, [enriched, groupBy]);

  function showGroupHeader(idx) {
    if (!groupBy) return null;
    if (idx === 0) return sorted[0];
    if (sorted[idx].market !== sorted[idx - 1].market) return sorted[idx];
    return null;
  }

  if (loading) return <div className="global-loading">Cargando...</div>;
  if (error)   return <div className="global-loading">{error}</div>;

  return (
    <div className="global-container">

      <div className="global-header">
        <div>
          <h1>Universe Institucional</h1>
          <div style={{ color: "#94a3b8", fontSize: "0.85rem", marginTop: 4 }}>
            {subtitle}
          </div>
        </div>

        <button
          onClick={() => setGroupBy((v) => !v)}
          style={{
            background: groupBy ? "#1d4ed8" : "#1e293b",
            color: "#e2e8f0",
            border: "1px solid #334155",
            borderRadius: 8,
            padding: "6px 14px",
            cursor: "pointer",
            fontSize: "0.82rem",
            fontWeight: 600,
          }}
        >
          {groupBy ? "🌍 Por país" : "📊 Por alpha"}
        </button>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Activo</th>
            <th>Alpha</th>
            <th>Confianza</th>
            <th>Posición</th>
            <th>Estado</th>
          </tr>
        </thead>

        <tbody>
          {sorted.map((r, idx) => {
            const groupHeader = showGroupHeader(idx);
            return (
              <>
                {groupHeader && (
                  <tr key={`group-${groupHeader.market}`}>
                    <td
                      colSpan={5}
                      style={{
                        background: "#0f172a",
                        color: "#94a3b8",
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        padding: "6px 12px",
                        letterSpacing: "0.08em",
                        borderBottom: "1px solid #1e293b",
                      }}
                    >
                      {groupHeader.flag} {groupHeader.market}
                      {" · "}
                      {sorted.filter((x) => x.market === groupHeader.market).length} activos
                    </td>
                  </tr>
                )}

                <tr key={r.ticker}>
                  <td>
                    <Link
                      to={`/analysis?ticker=${r.ticker}`}
                      style={{ color: "#38bdf8", fontWeight: 700, textDecoration: "none" }}
                    >
                      {r.ticker}
                      <span style={{ marginLeft: 6, fontSize: "1rem" }}>
                        {r.flag}
                      </span>
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
                    {r.positionValue > 0 ? "$" + r.positionValue.toFixed(0) : "—"}
                  </td>

                  <EstadoCell executable={r.executable} block_reason={r.block_reason} />
                </tr>
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
