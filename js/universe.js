// js/universe.js
// =======================================
// 🌍 UNIVERSO DEL SISTEMA (BACKEND-ALIGNED)
// - Fuente: /dashboard/latest/{ticker}
// - Frontend SOLO OBSERVA
// - NO calcula, NO decide
// =======================================

import { switchTab } from "./tabs.js";
import { loadAnalysis } from "./analysis.js";

const API = "https://spy-2w-price-prediction.onrender.com";

let universe = [];
let lastRefresh = 0;
let degraded = false;

// ---------------------------
// API helper
// ---------------------------
async function apiGet(url) {
  try {
    const res = await fetch(`${API}${url}`, {
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
// Formatters (UI ONLY)
// ---------------------------
function formatReturn(v) {
  if (v == null) return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return "—";
  const color = n >= 0 ? "#10b981" : "#ef4444";
  return `<span style="color:${color};font-weight:600">${n.toFixed(2)}%</span>`;
}

function formatQuality(rec) {
  const map = {
    BUY: "🔥",
    HOLD: "⚠️",
    SELL: "❌",
    MANTEN: "⚠️"
  };
  return map[rec] || "—";
}

function formatConfidence(ret) {
  if (ret == null) return "—";
  const n = Math.min(Math.abs(ret) / 5, 1);
  return `${Math.round(n * 100)}%`;
}

// ---------------------------
// Carga principal
// ---------------------------
export async function loadUniverse(force = false) {
  const now = Date.now();

  if (!force && now - lastRefresh < 5 * 60 * 1000) {
    renderUniverseTable();
    return;
  }

  degraded = false;
  universe = [];

  try {
    console.log("🌍 Cargando universo…");

    // 1️⃣ Obtener tickers
    const tickersRes = await apiGet("/dashboard/tickers");
    const tickers = Array.isArray(tickersRes?.tickers)
      ? tickersRes.tickers
      : [];

    // 2️⃣ Snapshot por ticker
    const snapshots = await Promise.all(
      tickers.map(t =>
        apiGet(`/dashboard/latest/${t}`).then(r => {
          const result = r?.latest?.result || null;

          return {
            ticker: t,
            data: result
          };
        })
      )
    );

    // 3️⃣ Normalizar para UI
    universe = snapshots
      .filter(x => x.data)
      .map(x => ({
        ticker: x.ticker,
        ret: x.data.ret_ens_pct ?? null,
        recommendation: x.data.recommendation ?? null
      }));

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

  universe.forEach(u => {
    const tr = document.createElement("tr");
    tr.className = "hoverable";

    tr.innerHTML = `
      <td class="ticker"><strong>${u.ticker}</strong></td>
      <td class="quality">${formatQuality(u.recommendation)}</td>
      <td class="confidence">${formatConfidence(u.ret)}</td>
      <td class="return">${formatReturn(u.ret)}</td>
      <td class="fundamental">—</td>
    `;

    tr.onclick = e => {
      e.preventDefault();
      switchTab("analysis");
      loadAnalysis(u.ticker);
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
    el.textContent = "⚠️ Universo no disponible (API)";
    el.style.color = "#f59e0b";
    return;
  }

  el.style.color = "";
  el.innerHTML = `🌍 Universo: <strong>${universe.length}</strong>`;
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
  .hoverable:hover {
    background: #f3f4f6 !important;
    cursor: pointer;
  }
  .ticker {
    font-family: "SF Mono", monospace;
  }
`;
document.head.appendChild(style);

export default {
  initUniverse,
  loadUniverse
};
