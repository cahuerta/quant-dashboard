// js/universe.js
// =====================================================
// 🌍 UNIVERSO DEL SISTEMA (ALINEADO AL BACKEND REAL)
// Fuente: /dashboard/tickers
// Fuente: /dashboard/latest/{ticker}
// Lee (con fallbacks robustos):
//   ret_ens_pct, price_now, price_pred, recommendation
// =====================================================

import { switchTab } from "./tabs.js";
import { loadAnalysis } from "./analysis.js";

const API = "https://spy-2w-price-prediction.onrender.com";

let universe = [];
let lastRefresh = 0;
let degraded = false;
let lastError = "";

// ---------------------------
// API helper
// ---------------------------
async function apiGet(url) {
  try {
    const res = await fetch(`${API}${url}`, {
      cache: "no-cache",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    degraded = true;
    lastError = `${url} -> ${err?.message || "fetch_failed"}`;
    console.error("❌ API error:", lastError);
    return null;
  }
}

// ---------------------------
// Extractor (canónico + fallbacks)
// ---------------------------
function extractPredictionPayload(r) {
  // Puede venir como prediction o plano en result
  return (
    r?.latest?.result?.prediction || // ✅ cuando existe prediction
    r?.latest?.prediction ||         // fallback
    r?.latest?.result ||             // ✅ cuando viene plano (como tu JSON)
    null
  );
}

// ---------------------------
// Safe getters (clave para recommendation)
// ---------------------------
function getField(r, p, key) {
  // Busca primero en prediction/result extraído (p),
  // luego en latest.result directo, luego en latest directo.
  return (
    p?.[key] ??
    r?.latest?.result?.[key] ??
    r?.latest?.[key] ??
    null
  );
}

// ---------------------------
// Formatters
// ---------------------------
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

function fmtRecommendation(rec) {
  if (!rec) return "—";
  const r = String(rec).toUpperCase();

  // soporta BUY/HOLD/SELL y tu "MANTEN"
  if (r === "BUY") return `BUY 🔥`;
  if (r === "SELL") return `SELL ❌`;
  if (r === "HOLD" || r === "MANTEN") return `${rec} ⚠️`;

  return rec; // si aparece otro label
}

// ---------------------------
// Load universe
// ---------------------------
export async function loadUniverse(force = false) {
  const now = Date.now();
  if (!force && now - lastRefresh < 5 * 60 * 1000) {
    renderUniverseTable();
    return;
  }

  degraded = false;
  lastError = "";
  universe = [];

  // 1) tickers
  const t = await apiGet("/dashboard/tickers");
  const tickers = Array.isArray(t?.tickers) ? t.tickers : [];
  const sig = await apiGet("/signals");
  const signals = Array.isArray(sig?.signals) ? sig.signals : [];
  const signalsByTicker = Object.fromEntries(
     signals.map(s => [s.ticker, s])
  );


  // 2) snapshots
  const snaps = await Promise.allSettled(
    tickers.map(async (ticker) => {
      const r = await apiGet(`/dashboard/latest/${ticker}`);
      const p = extractPredictionPayload(r);

      // 👇 lectura robusta por campo
      const rec = getField(r, p, "recommendation");
      const ret = getField(r, p, "ret_ens_pct");
      const priceNow = getField(r, p, "price_now");
      const pricePred = getField(r, p, "price_pred");
      const s = signalsByTicker[ticker];
      const fundamentalFlag = s?.fundamental_flag ?? null;

      return { ticker, rec, ret, priceNow, pricePred,fundamentalFlag };
    })
  );

  universe = snaps.map((s, i) =>
    s.status === "fulfilled"
      ? s.value
      : { ticker: tickers[i], rec: null, ret: null, priceNow: null, pricePred: null }
  );

  lastRefresh = now;
  renderUniverseTable();
}

// ---------------------------
// Render UI
// ---------------------------
function renderUniverseTable() {
  const tbody = document.querySelector("#universe-table tbody");
  const status = document.getElementById("universe-status");
  if (!tbody) return;

  tbody.innerHTML = "";

  universe.forEach((u) => {
    const tr = document.createElement("tr");
    tr.className = "hoverable";
    tr.innerHTML = `
      <td class="ticker"><strong>${u.ticker}</strong></td>
      <td class="rec">${fmtRecommendation(u.rec)}</td>
      <td class="price-now">${fmtPrice(u.priceNow)}</td>
      <td class="price-pred">${fmtPrice(u.pricePred)}</td>
      <td class="confidence">${fmtConfidence(u.ret)}</td>
      <td class="return">${fmtReturn(u.ret)}</td>
      <td class="fundamental">${u.fundamentalFlag ?? "—"}</td>

    `;

    tr.onclick = (e) => {
      e.preventDefault();
      switchTab("analysis");
      loadAnalysis(u.ticker);
    };

    tbody.appendChild(tr);
  });

  if (status) {
    if (degraded) {
      status.innerHTML = `⚠️ Error de backend`;
      status.style.color = "#f59e0b";
      console.warn("Universe degraded:", lastError);
    } else {
      status.style.color = "";
      status.innerHTML = `🌍 Universo: <strong>${universe.length}</strong>`;
    }
  }
}

// ---------------------------
// Init
// ---------------------------
export function initUniverse() {
  loadUniverse(true);
  setInterval(() => loadUniverse(true), 5 * 60 * 1000);
}

// ---------------------------
// Estilos mínimos
// ---------------------------
const style = document.createElement("style");
style.textContent = `
  .hoverable:hover { background: #f3f4f6 !important; cursor: pointer; }
  .ticker { font-family: "SF Mono", monospace; }
`;
document.head.appendChild(style);

export default { initUniverse, loadUniverse };
