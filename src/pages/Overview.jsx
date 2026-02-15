import { useEffect, useMemo, useState } from "react";
import "../styles/global.css";

const API = import.meta.env.VITE_API_URL || "https://spy-2w-price-prediction.onrender.com";

// ---------------------------
// Helpers
// ---------------------------
async function apiGet(path) {
  try {
    const res = await fetch(`${API}${path}`, {
      cache: "no-cache",
      headers: { Accept: "application/json" }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    return null;
  }
}

function fmtPct(v, decimals = 1) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(decimals)}%`;
}

function fmtNum(v, decimals = 2) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(decimals);
}

function fmtMoney(v, currency = "USD") {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  try {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency,
      maximumFractionDigits: 2
    }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
}

function modeLabel(mode) {
  const m = String(mode || "").toLowerCase();
  if (m === "growth") return "🟢 GROWTH";
  if (m === "neutral") return "🟡 NEUTRAL";
  if (m === "defensive") return "🔴 DEFENSIVE";
  return "—";
}

function modeColorClass(mode) {
  const m = String(mode || "").toLowerCase();
  if (m === "growth") return "value-success";
  if (m === "neutral") return "value-warning";
  if (m === "defensive") return "value-danger";
  return "";
}

function safeLen(arr) {
  return Array.isArray(arr) ? arr.length : 0;
}

// ---------------------------
// Overview (GLOBAL SUMMARY)
// ---------------------------
export default function Overview() {
  const [loading, setLoading] = useState(true);

  // Market
  const [market, setMarket] = useState(null);

  // Universe / Signals
  const [tickers, setTickers] = useState([]);
  const [signals, setSignals] = useState([]);

  // Pipeline / Status
  const [status, setStatus] = useState(null);

  // Optional Portfolio (puede no existir aún)
  const [portfolio, setPortfolio] = useState(null);
  const [capital, setCapital] = useState(null);

  // ---------------------------
  // Load ALL (safe)
  // ---------------------------
  useEffect(() => {
    let alive = true;

    async function loadAll() {
      setLoading(true);

      const [
        marketCtx,
        tickersRes,
        signalsRes,
        dashStatus,
        portfolioRes
      ] = await Promise.all([
        apiGet("/dashboard/market-context"),
        apiGet("/dashboard/tickers"),
        apiGet("/signals?min_confidence=-1"),
        apiGet("/dashboard/status"),
        // este puede NO existir (ok)
        apiGet("/portfolio/summary")
      ]);

      if (!alive) return;

      setMarket(marketCtx);
      setTickers(Array.isArray(tickersRes?.tickers) ? tickersRes.tickers : []);
      setSignals(Array.isArray(signalsRes?.signals) ? signalsRes.signals : []);
      setStatus(dashStatus);

      // portfolio summary (si existe)
      if (portfolioRes && typeof portfolioRes === "object") {
        setPortfolio(portfolioRes?.portfolio || portfolioRes);
        setCapital(portfolioRes?.capital_state || portfolioRes?.capital || null);
      } else {
        setPortfolio(null);
        setCapital(null);
      }

      setLoading(false);
    }

    loadAll();
    const t = setInterval(loadAll, 60 * 1000); // refresh 1 min (overview)
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  // ---------------------------
  // Derived stats
  // ---------------------------
  const stats = useMemo(() => {
    const totalTickers = safeLen(tickers);
    const totalSignals = safeLen(signals);

    const strong = signals.filter(s => (s?.confidence ?? 0) >= 0.7).length;
    const good = signals.filter(s => (s?.confidence ?? 0) >= 0.55 && (s?.confidence ?? 0) < 0.7).length;
    const weak = signals.filter(s => (s?.confidence ?? 0) >= 0.4 && (s?.confidence ?? 0) < 0.55).length;

    const deepValue = signals.filter(s => s?.fundamental_flag?.includes("DEEP_VALUE")).length;
    const overheated = signals.filter(s => s?.fundamental_flag?.includes("OVERHEATED")).length;

    // recomendaciones (desde signals)
    const buy = signals.filter(s => String(s?.recommendation || "").toUpperCase().includes("COMPRA")).length;
    const sell = signals.filter(s => String(s?.recommendation || "").toUpperCase().includes("VENDE")).length;
    const hold = signals.filter(s => String(s?.recommendation || "").toUpperCase().includes("MANT")).length;

    return {
      totalTickers,
      totalSignals,
      strong,
      good,
      weak,
      deepValue,
      overheated,
      buy,
      sell,
      hold
    };
  }, [tickers, signals]);

  // ---------------------------
  // UI
  // ---------------------------
  if (loading) {
    return (
      <div className="global-container">
        <div className="global-loading">Cargando Overview global…</div>
      </div>
    );
  }

  const marketMode = market?.market_mode ?? market?.marketMode ?? null;
  const marketConf = market?.confidence;
  const marketReason = market?.reason;

  const portfolioValue =
    capital?.total_value ??
    portfolio?.total_value ??
    portfolio?.totalValue ??
    null;

  const vol = capital?.volatility_annual;
  const var95 = capital?.var_95_annual;
  const es95 = capital?.expected_shortfall_95_annual;
  const beta = capital?.beta_vs_spy;

  const nPositions =
    portfolio?.positions_count ??
    safeLen(portfolio?.positions) ??
    null;

  return (
    <div className="global-container">
      {/* HEADER */}
      <div className="global-header">
        <h1>📌 Overview Global</h1>

        <div className="global-mode">
          <span>Market Mode</span>
          <strong className={modeColorClass(marketMode)}>{modeLabel(marketMode)}</strong>
          <div style={{ marginTop: 6, fontSize: 12, color: "var(--text-secondary)" }}>
            Conf: <strong style={{ color: "var(--text-primary)" }}>
              {marketConf == null ? "—" : fmtNum(marketConf, 2)}
            </strong>
          </div>
        </div>
      </div>

      {/* GRID */}
      <div className="global-grid">
        {/* Universe */}
        <div className="global-card">
          <div className="global-card-title">Universo (tickers)</div>
          <div className="global-card-value">{stats.totalTickers || "—"}</div>
        </div>

        {/* Signals */}
        <div className="global-card">
          <div className="global-card-title">Señales totales</div>
          <div className="global-card-value">{stats.totalSignals || "—"}</div>
        </div>

        <div className="global-card">
          <div className="global-card-title">Señales fuertes (≥ 0.70)</div>
          <div className="global-card-value value-success">{stats.strong}</div>
        </div>

        <div className="global-card">
          <div className="global-card-title">Señales buenas (0.55–0.69)</div>
          <div className="global-card-value value-warning">{stats.good}</div>
        </div>

        <div className="global-card">
          <div className="global-card-title">Señales débiles (0.40–0.54)</div>
          <div className="global-card-value">{stats.weak}</div>
        </div>

        <div className="global-card">
          <div className="global-card-title">Fundamental: Deep Value</div>
          <div className="global-card-value value-success">{stats.deepValue}</div>
        </div>

        <div className="global-card">
          <div className="global-card-title">Fundamental: Overheated</div>
          <div className="global-card-value value-danger">{stats.overheated}</div>
        </div>

        {/* Recommendations */}
        <div className="global-card">
          <div className="global-card-title">Recomendaciones COMPRA</div>
          <div className="global-card-value value-success">{stats.buy}</div>
        </div>

        <div className="global-card">
          <div className="global-card-title">Recomendaciones VENDE</div>
          <div className="global-card-value value-danger">{stats.sell}</div>
        </div>

        <div className="global-card">
          <div className="global-card-title">Recomendaciones MANTÉN</div>
          <div className="global-card-value value-warning">{stats.hold}</div>
        </div>

        {/* Portfolio (optional) */}
        <div className="global-card">
          <div className="global-card-title">Portafolio: Valor</div>
          <div className="global-card-value">
            {portfolioValue == null ? "—" : fmtMoney(portfolioValue, "USD")}
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-secondary)" }}>
            Posiciones: <strong style={{ color: "var(--text-primary)" }}>{nPositions ?? "—"}</strong>
          </div>
        </div>

        <div className="global-card">
          <div className="global-card-title">Riesgo: Volatilidad anual</div>
          <div className="global-card-value">
            {vol == null ? "—" : fmtPct(vol * 100, 1)}
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-secondary)" }}>
            Beta vs SPY: <strong style={{ color: "var(--text-primary)" }}>{beta == null ? "—" : fmtNum(beta, 2)}</strong>
          </div>
        </div>

        <div className="global-card">
          <div className="global-card-title">Riesgo: VaR95 anual</div>
          <div className="global-card-value">
            {var95 == null ? "—" : fmtPct(var95 * 100, 1)}
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-secondary)" }}>
            ES95 anual: <strong style={{ color: "var(--text-primary)" }}>
              {es95 == null ? "—" : fmtPct(es95 * 100, 1)}
            </strong>
          </div>
        </div>

        {/* Pipeline / Health */}
        <div className="global-card">
          <div className="global-card-title">Pipeline / Datos</div>
          <div className="global-card-value">
            {status?.predictions_exists ? "✅ OK" : "—"}
          </div>
          <div style={{ marginTop: 10, fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
            Tickers: <strong style={{ color: "var(--text-primary)" }}>{status?.n_tickers ?? stats.totalTickers ?? "—"}</strong><br />
            Último update: <strong style={{ color: "var(--text-primary)" }}>{status?.timestamp ?? "—"}</strong>
          </div>
        </div>

      </div>

      {/* REASON */}
      <div style={{ marginTop: 26, opacity: 0.9 }}>
        <div style={{ color: "var(--text-secondary)", fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}>
          Contexto de mercado (motivo)
        </div>
        <div style={{ marginTop: 8, fontSize: 14, color: "var(--text-primary)" }}>
          {marketReason || "—"}
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: 22, fontSize: 12, color: "var(--text-secondary)", opacity: 0.85 }}>
        Fuente: {API}
      </div>
    </div>
  );
  }
