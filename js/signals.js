// js/signals.js
// =======================================
// 🚨 SIGNALS VIEWER (PRODUCTION READY)
// - SOLO visor (NO decisiones)
// - Consume /signals
// - Ordenable + clickable
// - Auto-refresh cada 5 min
// - Integrado con analysis.js
// =======================================

import { switchTab } from "./tabs.js";
import { loadAnalysis } from "./analysis.js";

const API = "https://spy-2w-price-prediction.onrender.com";

let signals = [];
let lastRefresh = 0;
let refreshTimer = null;

// ----------------------------------
// API helper
// ----------------------------------
async function apiGet(url, params = {}) {
  const qs = new URLSearchParams(params);
  const full = `${API}${url}${qs.toString() ? `?${qs}` : ""}`;

  try {
    const r = await fetch(full, {
      cache: "no-cache",
      headers: { Accept: "application/json" }
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } catch (err) {
    console.error("❌ Signals API error:", err);
    return { signals: [] };
  }
}

// ----------------------------------
// Formatters
// ----------------------------------
function fmtReturn(v) {
  if (v == null) return "—";
  const n = Number(v);
  const color = n >= 0 ? "#10b981" : "#ef4444";
  return `<span style="color:${color};font-weight:600">${n.toFixed(1)}%</span>`;
}

function fmtConfidence(c) {
  if (c == null) return "—";
  return `${(Number(c) * 100).toFixed(0)}%`;
}

function fmtQuality(q) {
  return q || "—";
}

// ----------------------------------
// Load signals (cached)
// ----------------------------------
export async function loadSignals(force = false) {
  const now = Date.now();

  if (!force && (now - lastRefresh) < 5 * 60 * 1000) {
    renderSignalsTable();
    return;
  }

  try {
    console.log("🚨 Cargando señales…");

    const res = await apiGet("/signals", { min_confidence: 0 });
    signals = Array.isArray(res.signals) ? res.signals : [];

    lastRefresh = now;
    renderSignalsTable();
    updateSignalsStatus();

  } catch (err) {
    console.error("❌ Error cargando señales:", err);
  }
}

// ----------------------------------
// Render table
// ----------------------------------
function renderSignalsTable() {
  const tbody = document.querySelector("#signals-table tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  [...signals]
    .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))
    .forEach(s => {
      const tr = document.createElement("tr");
      tr.className = "hoverable";

      tr.innerHTML = `
        <td><strong>${s.ticker}</strong></td>
        <td>${fmtQuality(s.quality)}</td>
        <td>${fmtConfidence(s.confidence)}</td>
        <td>${s.recommendation ?? "—"}</td>
        <td>${fmtReturn(s.ret_ens_pct)}</td>
        <td>${s.fundamental_flag ?? "—"}</td>
      `;

      tr.onclick = () => {
        switchTab("analysis");
        loadAnalysis(s.ticker);
      };

      tbody.appendChild(tr);
    });
}

// ----------------------------------
// Status footer
// ----------------------------------
function updateSignalsStatus() {
  const el = document.getElementById("signals-status");
  if (!el) return;

  const strong = signals.filter(s => (s.confidence ?? 0) >= 0.7).length;

  el.innerHTML = `
    🚨 Señales: <strong>${signals.length}</strong> |
    🔥 Fuertes: <strong>${strong}</strong> |
    ⏱ ${new Date(lastRefresh).toLocaleTimeString("es-CL")}
  `;
}

// ----------------------------------
// Auto refresh
// ----------------------------------
function startAutoRefresh() {
  if (refreshTimer) return;
  refreshTimer = setInterval(() => loadSignals(true), 5 * 60 * 1000);
}

// ----------------------------------
// Init
// ----------------------------------
export function initSignals() {
  startAutoRefresh();
  loadSignals(true);
}

// ----------------------------------
// API pública
// ----------------------------------
export function getSignals() {
  return signals;
}

export function getSignal(ticker) {
  return signals.find(s => s.ticker === ticker);
}

// ----------------------------------
// CSS hover (safe)
// ----------------------------------
const style = document.createElement("style");
style.textContent = `
  .hoverable:hover {
    background: #f3f4f6;
    cursor: pointer;
    transform: scale(1.01);
    transition: all .15s ease;
  }
`;
document.head.appendChild(style);

export default {
  initSignals,
  loadSignals,
  getSignals,
  getSignal
};
