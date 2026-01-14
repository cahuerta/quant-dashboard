// js/universe.js
// =====================================================
// 🌍 UNIVERSO DEL SISTEMA (ALINEADO AL BACKEND REAL)
// Fuente: /dashboard/tickers
// Fuente: /dashboard/latest/{ticker}
// Lee:
//   latest.result.prediction.ret_ens_pct
//   latest.result.prediction.recommendation
// (fallbacks incluidos por si cambias el backend después)
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
// Extractor (ALINEADO)
// ---------------------------
function extractPredictionPayload(r) {
  // Backend real observado:
  // r.latest.result.prediction.{ret_ens_pct, recommendation, ...}
  // 1

  const pred =
    r?.latest?.result?.prediction || // ✅ real
    r?.latest?.prediction ||         // fallback
    r?.latest?.result ||             // fallback viejo
    null;

  return pred;
}

// ---------------------------
// Formatters
// ---------------------------
function fmt(v) {
  return v == null ? "—" : v;
}

function fmtReturn(v) {
  if (v == null) return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return "—";
  const color = n >= 0 ? "#16a34a" : "#dc2626";
  return `<span style="color:${color};font-weight:600">${n.toFixed(2)}%</span>`;
}

function fmtConfidence(ret) {
  // heurística simple: |ret|/5 cap 100%
  if (ret == null) return "—";
  const n = Math.min(Math.abs(Number(ret)) / 5, 1);
  if (Number.isNaN(n)) return "—";
  return `${Math.round(n * 100)}%`;
}

function fmtQuality(rec) {
  const map = { BUY: "🔥", HOLD: "⚠️", SELL: "❌" };
  return map[String(rec || "").toUpperCase()] || "—";
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

  // 2) snapshots
  const snaps = await Promise.allSettled(
    tickers.map(async (ticker) => {
      const r = await apiGet(`/dashboard/latest/${ticker}`);
      const pred = extractPredictionPayload(r);

      return {
        ticker,
        pred, // puede ser null si falló
      };
    })
  );

  universe = snaps.map((s, i) => {
    if (s.status !== "fulfilled") {
      return { ticker: tickers[i], rec: null, ret: null };
    }
    const p = s.value.pred;
    return {
      ticker: s.value.ticker,
      rec: p?.recommendation ?? null,
      ret: p?.ret_ens_pct ?? null,
    };
  });

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
      <td class="quality">${u.rec ? fmtQuality(u.rec) : "—"}</td>
      <td class="confidence">${fmtConfidence(u.ret)}</td>
      <td class="return">${fmtReturn(u.ret)}</td>
      <td class="fundamental">—</td>
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
      // deja pista exacta en consola
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
