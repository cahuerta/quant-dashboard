// js/universe.js
// =======================================
// 🌍 UNIVERSO DEL SISTEMA (FINAL LIMPIO)
// - Fuente única: /dashboard/tickers
// - NO assets | NO signals
// - Click → analysis
// - Auto-refresh cada 5min
// =======================================

import { switchTab } from "./tabs.js";
import { loadAnalysis } from "./analysis.js";

const API = "https://spy-2w-price-prediction.onrender.com";

let universe = [];
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
    console.log("🌍 Cargando universo (dashboard/tickers)…");

    const res = await apiGet("/dashboard/tickers");

    // Backend devuelve: { tickers: ["SPY","AAPL",...], count: N }
    universe = Array.isArray(res?.tickers)
      ? res.tickers.map(t => ({ ticker: t }))
      : [];

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
    const tr = document.createElement("tr");
    tr.className = "hoverable";
    tr.innerHTML = `
      <td class="ticker"><strong>${a.ticker}</strong></td>
      <td class="status">OK</td>
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

  el.style.color = "";
  el.innerHTML = `🌍 Universo: <strong>${universe.length}</strong>`;
}

// ---------------------------
// API pública
// ---------------------------
export function getUniverse() {
  return universe;
}

export function getStatus() {
  return {
    total: universe.length,
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
  .status {
    color: #10b981;
    font-weight: 600;
  }
`;
document.head.appendChild(style);

// Export default
export default {
  initUniverse,
  loadUniverse,
  getUniverse,
  getStatus
};
