// js/universe.js
// =====================================================
// 🌍 UNIVERSO DEL SISTEMA (ALINEADO + MARKET CONTEXT)
// =====================================================

import { switchTab } from "./tabs.js";
import { loadAnalysis } from "./analysis.js";

const API = "https://spy-2w-price-prediction.onrender.com";

let universe = [];
let marketContext = null;
let lastRefresh = 0;

// ------------------------------------------------
// API helper
// ------------------------------------------------
async function apiGet(url) {
  try {
    const res = await fetch(`${API}${url}`, {
      cache: "no-cache",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("❌ API error:", url, err?.message);
    return null;
  }
}

// ------------------------------------------------
// Extractor prediction
// ------------------------------------------------
function extractPredictionPayload(r) {
  return (
    r?.latest?.result?.prediction ||
    r?.latest?.prediction ||
    r?.latest?.result ||
    null
  );
}

function getField(r, p, key) {
  return (
    p?.[key] ??
    r?.latest?.result?.[key] ??
    r?.latest?.[key] ??
    null
  );
}

// ------------------------------------------------
// Formatters
// ------------------------------------------------
function fmtReturn(v) {
  if (v == null) return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return "—";
  const color = n >= 0 ? "#16a34a" : "#dc2626";
  return `<span style="color:${color};font-weight:600">${n.toFixed(2)}%</span>`;
}

function fmtConfidence(ret) {
  if (ret == null) return "—";
  const n = Math.min(Math.abs(Number(ret)) / 5, 1);
  if (Number.isNaN(n)) return "—";
  return `${Math.round(n * 100)}%`;
}

function fmtPrice(v) {
  if (v == null) return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return "—";
  return `$${n.toFixed(2)}`;
}

// ------------------------------------------------
// ✅ Recomendación NORMALIZADA (ESPAÑOL)
// ------------------------------------------------
function fmtRecommendation(rec) {
  if (!rec) return "—";

  const r = String(rec).toUpperCase();

  if (r.includes("COMPRA")) return "🟢 COMPRA";
  if (r.includes("VENDE")) return "🔴 VENDE";
  if (r.includes("MANT")) return "🟡 MANTÉN";

  return rec;
}

// ------------------------------------------------
// Ejecución vs mercado
// ------------------------------------------------
function evaluateExecution(rec) {
  if (!marketContext) return "—";

  const mode = marketContext.market_mode;
  const r = String(rec || "").toUpperCase();

  if (mode === "defensive" && r.includes("COMPRA"))
    return "🚫 BLOQUEADO";

  if (mode === "growth" && r.includes("VENDE"))
    return "⚠️ REVISAR";

  return "✅ EJECUTAR";
}

// ------------------------------------------------
// Load universe
// ------------------------------------------------
export async function loadUniverse(force = false) {
  const now = Date.now();
  if (!force && now - lastRefresh < 5 * 60 * 1000) {
    renderUniverseTable();
    return;
  }

  universe = [];

  // Market context
  marketContext = await apiGet("/dashboard/market-context");
  renderMarketBanner();

  // Tickers
  const t = await apiGet("/dashboard/tickers");
  const tickers = Array.isArray(t?.tickers) ? t.tickers : [];

  const sig = await apiGet("/signals");
  const signals = Array.isArray(sig?.signals) ? sig.signals : [];
  const signalsByTicker = Object.fromEntries(
    signals.map((s) => [s.ticker, s])
  );

  // Snapshots
  const snaps = await Promise.allSettled(
    tickers.map(async (ticker) => {
      const r = await apiGet(`/dashboard/latest/${ticker}`);
      const p = extractPredictionPayload(r);

      const rec = getField(r, p, "recommendation");
      const ret = getField(r, p, "ret_ens_pct");
      const priceNow = getField(r, p, "price_now");
      const pricePred = getField(r, p, "price_pred");

      const s = signalsByTicker[ticker];
      const fundamentalFlag = s?.fundamental_flag ?? null;

      return { ticker, rec, ret, priceNow, pricePred, fundamentalFlag };
    })
  );

  universe = snaps.map((s, i) =>
    s.status === "fulfilled"
      ? s.value
      : {
          ticker: tickers[i],
          rec: null,
          ret: null,
          priceNow: null,
          pricePred: null,
          fundamentalFlag: null,
        }
  );

  lastRefresh = now;
  renderUniverseTable();
}

// ------------------------------------------------
// Render banner
// ------------------------------------------------
function renderMarketBanner() {
  if (!marketContext) return;

  const modeEl = document.getElementById("market-mode");
  const confEl = document.getElementById("market-confidence");
  const reasonEl = document.getElementById("market-reason");

  if (modeEl) modeEl.innerText = marketContext.market_mode ?? "—";
  if (confEl) confEl.innerText = marketContext.confidence ?? "—";
  if (reasonEl) reasonEl.innerText = marketContext.reason ?? "—";
}

// ------------------------------------------------
// Render table
// ------------------------------------------------
function renderUniverseTable() {
  const tbody = document.querySelector("#universe-table tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  universe.forEach((u) => {
    const execution = evaluateExecution(u.rec);

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td><strong>${u.ticker}</strong></td>
      <td>${fmtRecommendation(u.rec)}</td>
      <td>${fmtPrice(u.priceNow)}</td>
      <td>${fmtPrice(u.pricePred)}</td>
      <td>${fmtConfidence(u.ret)}</td>
      <td>${fmtReturn(u.ret)}</td>
      <td>${marketContext?.market_mode ?? "—"}</td>
      <td>${execution}</td>
      <td>${u.fundamentalFlag ?? "—"}</td>
    `;

    tr.onclick = (e) => {
      e.preventDefault();
      switchTab("analysis");
      loadAnalysis(u.ticker);
    };

    tbody.appendChild(tr);
  });
}

// ------------------------------------------------
// Init
// ------------------------------------------------
export function initUniverse() {
  loadUniverse(true);
  setInterval(() => loadUniverse(true), 5 * 60 * 1000);
}

export default { initUniverse, loadUniverse };
