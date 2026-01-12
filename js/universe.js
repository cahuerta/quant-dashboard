// js/universe.js
// =======================================
// 🌍 UNIVERSO DEL SISTEMA (PRODUCTION READY)
// - Carga paralela assets + signals
// - Indexación O(1) signals por ticker
// - Auto-refresh cada 5min
// - Error handling robusto
// - Click → analysis flow suave
// =======================================

import { switchTab } from "./tabs.js";
import { loadAnalysis } from "./analysis.js";

const API = "https://spy-2w-price-prediction.onrender.com";

let universe = [];
let signalsIndex = {};
let lastRefresh = 0;
let degraded = false;

// ---------------------------
// API helper (defensivo)
// ---------------------------
async function apiGet(url, params = {}) {
  const urlParams = new URLSearchParams(params);
  const fullUrl = `${API}${url}${urlParams.toString() ? `?${urlParams}` : ""}`;

  try {
    const res = await fetch(fullUrl, {
      cache: "no-cache",
      headers: { Accept: "application/json" }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error(`❌ API error: ${url}`, err);
    degraded = true;
    return null;
  }
}

// ---------------------------
// Formatters
// ---------------------------
function formatReturn(v) {
  if (v == null) return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return "—";
  const color = n >= 0 ? "#10b981" : "#ef4444";
  return `<span style="color:${color};font-weight:600">${n.toFixed(1)}%</span>`;
}

function formatConfidence(c) {
  if (c == null) return "—";
  const n = Number(c);
  if (Number.isNaN(n)) return "—";
  return n <= 1 ? `${(n * 100).toFixed(0)}%` : `${n.toFixed(0)}%`;
}

function formatQuality(q) {
  const icons = {
    "🔥 STRONG": "🔥",
    "✅ GOOD": "✅",
    "⚠️ WEAK": "⚠️",
    "❌ NOISE": "❌",
    "NO_DATA": "—"
  };
  return icons[q] || q || "—";
}

// ---------------------------
// Carga principal
// ---------------------------
export async function loadUniverse(forceRefresh = false) {
  const now = Date.now();

  if (!forceRefresh && now - lastRefresh < 5 * 60 * 1000) {
    renderUniverseTable();
    return;
  }

  degraded = false;

  try {
    console.log("🌍 Cargando universo…");

    const [assetsRes, signalsRes] = await Promise.all([
      apiGet("/assets"),
      apiGet("/signals", { min_confidence: 0 })
    ]);

    universe = Array.isArray(assetsRes?.assets) ? assetsRes.assets : [];
    const signals = Array.isArray(signalsRes?.signals) ? signalsRes.signals : [];

    // Indexación O(1)
    signalsIndex = {};
    signals.forEach(s => {
      if (s?.ticker) signalsIndex[s.ticker] = s;
    });

    lastRefresh = now;
    renderUniverseTable();

  } catch (err) {
    console.error("❌ Error cargando universo:", err);
    degraded = true;
    renderUniverseTable();
  }
}

// ---------------------------
// Render UI
// ---------------------------
function renderUniverseTable() {
  const tbody = document.querySelector("#universe-table tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  universe.forEach(a => {
    const s = signalsIndex[a.ticker];

    const tr = document.createElement("tr");
    tr.className = "hoverable";
    tr.innerHTML = `
      <td class="ticker"><strong>${a.ticker}</strong></td>
      <td class="quality">${formatQuality(s?.quality)}</td>
      <td class="confidence">${formatConfidence(s?.confidence)}</td>
      <td class="return">${formatReturn(s?.ret_ens_pct)}</td>
      <td class="fundamental">${s?.fundamental_flag ?? "—"}</td>
    `;

    tr.onclick = e => {
      e.preventDefault();
      switchTab("analysis");
      loadAnalysis(a.ticker);
    };

    tbody.appendChild(tr);
  });

  updateUniverseStatus();
}

// ---------------------------
// Status
// ---------------------------
function updateUniverseStatus() {
  const el = document.getElementById("universe-status");
  if (!el) return;

  if (degraded) {
    el.innerHTML = "⚠️ Universo no disponible (API)";
    el.style.color = "#f59e0b";
    return;
  }

  const total = universe.length;
  const withSignal = Object.keys(signalsIndex).length;
  const strongSignals = Object.values(signalsIndex)
    .filter(s => Number(s?.confidence) >= 0.7).length;

  el.style.color = "";
  el.innerHTML = `
    🌍 Universo: <strong>${total}</strong> |
    Señales: <strong>${withSignal}</strong> |
    <span style="color:#10b981">Fuertes: ${strongSignals}</span>
  `;
}

// ---------------------------
// API pública
// ---------------------------
export function getUniverse() {
  return universe;
}

export function getSignal(ticker) {
  return signalsIndex[ticker];
}

export function getStatus() {
  return {
    total: universe.length,
    withSignal: Object.keys(signalsIndex).length,
    strongSignals: Object.values(signalsIndex)
      .filter(s => Number(s?.confidence) >= 0.7).length,
    lastRefresh: new Date(lastRefresh).toLocaleTimeString(),
    degraded
  };
}

// ---------------------------
// Auto-refresh background
// ---------------------------
let refreshInterval;
function startAutoRefresh() {
  if (refreshInterval) return;
  refreshInterval = setInterval(() => loadUniverse(true), 5 * 60 * 1000);
}

// ---------------------------
// Init
// ---------------------------
export function initUniverse() {
  startAutoRefresh();
  loadUniverse(true);
}

// ---------------------------
// Estilos (ideal mover a CSS)
// ---------------------------
const style = document.createElement("style");
style.textContent = `
  .hoverable:hover {
    background: #f3f4f6 !important;
    cursor: pointer;
    transform: scale(1.01);
    transition: all 0.15s ease;
  }
  .ticker {
    font-family: "SF Mono", monospace;
  }
`;
document.head.appendChild(style);

// Export default
export default {
  initUniverse,
  loadUniverse,
  getUniverse,
  getSignal,
  getStatus
};
