import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";

const API = import.meta.env.VITE_API_URL;

// ─── Helpers ────────────────────────────────────────────
const fmt$ = (v) =>
  v != null ? `$${Number(v).toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—";

const fmtPct = (v) =>
  v != null ? `${v >= 0 ? "+" : ""}${Number(v).toFixed(2)}%` : "—";

const retColor = (v) =>
  v == null ? "#94a3b8" : v > 0 ? "#22c55e" : v < 0 ? "#ef4444" : "#94a3b8";

// ─── Días desde una fecha ISO ────────────────────────────
function daysAgo(isoDate) {
  if (!isoDate) return null;
  const diff = Date.now() - new Date(isoDate).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// ─── Badge dirección predicha ────────────────────────────
function DirBadge({ ret }) {
  if (ret == null) return <span style={{ color: "#475569" }}>—</span>;
  return ret > 0
    ? <span style={{ color: "#22c55e", fontWeight: 700 }}>↑ {ret.toFixed(2)}%</span>
    : <span style={{ color: "#ef4444", fontWeight: 700 }}>↓ {ret.toFixed(2)}%</span>;
}

// ─── Badge días abierto ──────────────────────────────────
function DaysBadge({ days }) {
  if (days == null) return <span style={{ color: "#475569" }}>—</span>;
  const color = days >= 10 ? "#f97316" : days >= 7 ? "#eab308" : "#94a3b8";
  return (
    <span style={{ color, fontWeight: 600 }}>
      {days}d {days >= 10 ? "⚠" : ""}
    </span>
  );
}

// ════════════════════════════════════════════════════════
export default function Portfolio() {
  const [status,    setStatus]    = useState(null);
  const [positions, setPositions] = useState({});
  const [preds,     setPreds]     = useState({});
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        // 1. Status broker + posiciones en paralelo
        const [sRes, pRes] = await Promise.all([
          fetch(`${API}/trading/status`,    { cache: "no-store" }),
          fetch(`${API}/trading/positions`, { cache: "no-store" }),
        ]);

        if (!sRes.ok) throw new Error(`Status HTTP ${sRes.status}`);
        if (!pRes.ok) throw new Error(`Posiciones HTTP ${pRes.status}`);

        const [statusJson, posJson] = await Promise.all([
          sRes.json(),
          pRes.json(),
        ]);

        if (!alive) return;
        setStatus(statusJson);
        setPositions(posJson);

        // 2. Últimas predicciones por ticker (en paralelo, sin bloquear)
        const tickers = Object.keys(posJson);
        const predEntries = await Promise.all(
          tickers.map(async (t) => {
            try {
              const r = await fetch(`${API}/dashboard/latest/${t}`, { cache: "no-store" });
              if (!r.ok) return [t, null];
              const j = await r.json();
              const pred = j?.latest?.prediction ?? null;
              return [t, pred];
            } catch {
              return [t, null];
            }
          })
        );

        if (!alive) return;
        setPreds(Object.fromEntries(predEntries));

      } catch (err) {
        if (alive) setError(err?.message || "Error cargando portafolio");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => { alive = false; };
  }, []);

  // ── Filas de la tabla ──────────────────────────────────
  const rows = useMemo(() => {
    return Object.entries(positions).map(([ticker, pos]) => {
      const qty          = Number(pos.qty);
      const entryPrice   = Number(pos.avg_entry_price);
      const currentPrice = pos.current_price != null
        ? Number(pos.current_price)
        : Number(pos.market_value) / qty;
      const currentRet   = entryPrice > 0
        ? (currentPrice / entryPrice - 1) * 100
        : null;
      const pl           = Number(pos.unrealized_pl);

      const pred         = preds[ticker];
      const predRet      = pred?.ret_ens_pct ?? null;
      const targetPrice  = pred?.price_pred ?? null;
      const predDate     = pred?.date_base ?? null;
      const days         = daysAgo(predDate);

      return { ticker, qty, entryPrice, currentPrice, currentRet, pl, predRet, targetPrice, days };
    });
  }, [positions, preds]);

  // ── Resumen ────────────────────────────────────────────
  const summary = useMemo(() => ({
    totalPL:   rows.reduce((a, r) => a + (r.pl || 0), 0),
    inProfit:  rows.filter(r => (r.pl ?? 0) > 0).length,
    inLoss:    rows.filter(r => (r.pl ?? 0) < 0).length,
    expired:   rows.filter(r => (r.days ?? 0) >= 10).length,
  }), [rows]);

  // ── Render ─────────────────────────────────────────────
  if (loading) return <div className="global-loader">Cargando Portafolio...</div>;

  if (error) return (
    <div className="global-container">
      <p style={{ color: "#ef4444", padding: 16 }}>⚠ {error}</p>
    </div>
  );

  return (
    <div className="global-container">

      {/* ── KPIs broker ── */}
      <div className="g-section-header">
        <span className="g-section-icon">💼</span>
        <div>
          <div className="g-section-title">Portafolio</div>
          <div className="g-section-sub">
            {status?.paper ? "Paper Trading" : "Live"} · Alpaca
          </div>
        </div>
        <span className={`g-trend-badge ${status?.trading_blocked ? "g-trend-empeorando" : "g-trend-mejorando"}`}>
          {status?.trading_blocked ? "🔒 Bloqueado" : "✓ Activo"}
        </span>
      </div>

      <div className="g-kpi-row">
        <div className="g-kpi-main">
          <span className="g-kpi-label">Capital Total</span>
          <span className="g-kpi-val">
            {status?.equity != null ? `$${Number(status.equity).toLocaleString("es-CL")}` : "—"}
          </span>
        </div>
        <div className="g-kpi-main">
          <span className="g-kpi-label">Buying Power</span>
          <span className="g-kpi-val">
            {status?.buying_power != null ? `$${Number(status.buying_power).toLocaleString("es-CL")}` : "—"}
          </span>
        </div>
      </div>

      <div className="g-kpi-grid">
        <div className="g-kpi-sm">
          <span className="g-kpi-label">Posiciones</span>
          <span className="g-kpi-sm-val">{rows.length}</span>
        </div>
        <div className="g-kpi-sm">
          <span className="g-kpi-label">PnL No Realizado</span>
          <span className="g-kpi-sm-val" style={{ color: retColor(summary.totalPL) }}>
            {fmt$(summary.totalPL)}
          </span>
        </div>
        <div className="g-kpi-sm">
          <span className="g-kpi-label">En Positivo</span>
          <span className="g-kpi-sm-val" style={{ color: "#22c55e" }}>{summary.inProfit}</span>
        </div>
        <div className="g-kpi-sm">
          <span className="g-kpi-label">Horizonte Vencido</span>
          <span className="g-kpi-sm-val" style={{ color: summary.expired > 0 ? "#f97316" : "#94a3b8" }}>
            {summary.expired}
          </span>
        </div>
      </div>

      {/* ── Tabla posiciones ── */}
      {rows.length === 0 ? (
        <p className="curve-empty">Sin posiciones abiertas.</p>
      ) : (
        <div className="pf-table-wrap">
          <table className="pf-table">
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Qty</th>
                <th>Entrada</th>
                <th>Actual</th>
                <th>Ret %</th>
                <th>PnL USD</th>
                <th>Target</th>
                <th>Predicción</th>
                <th>Días</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.ticker}>
                  <td>
                    <Link
                      to={`/analysis?ticker=${r.ticker}`}
                      style={{ color: "#38bdf8", fontWeight: 700, textDecoration: "none" }}
                    >
                      {r.ticker}
                    </Link>
                  </td>
                  <td>{r.qty}</td>
                  <td>{fmt$(r.entryPrice)}</td>
                  <td>{fmt$(r.currentPrice)}</td>
                  <td style={{ color: retColor(r.currentRet), fontWeight: 700 }}>
                    {fmtPct(r.currentRet)}
                  </td>
                  <td style={{ color: retColor(r.pl), fontWeight: 700 }}>
                    {fmt$(r.pl)}
                  </td>
                  <td style={{ color: "#94a3b8" }}>
                    {r.targetPrice != null ? fmt$(r.targetPrice) : "—"}
                  </td>
                  <td><DirBadge ret={r.predRet} /></td>
                  <td><DaysBadge days={r.days} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Nota horizonte */}
      {summary.expired > 0 && (
        <p style={{ fontSize: 12, color: "#f97316", marginTop: 12 }}>
          ⚠ {summary.expired} posición{summary.expired > 1 ? "es" : ""} con horizonte de 10 días vencido — revisar cierre.
        </p>
      )}

    </div>
  );
                    }
