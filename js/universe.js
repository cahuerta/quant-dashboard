// js/universe.js
// =======================================
// 🌍 UNIVERSO DEL SISTEMA (BACKEND REAL)
// Fuente: /dashboard/latest/{ticker}
// Lee: latest.result (NO prediction)
// =======================================

import { switchTab } from "./tabs.js";
import { loadAnalysis } from "./analysis.js";

const API = "https://diction.onrender.com";

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

// ---------------------------
// Load universe
// ---------------------------
export async function loadUniverse(force = false) {
  const now = Date.now();
  if (!force && now - lastRefresh < 5 * 60 * 1000) {
    render();
    return;
  }

  degraded = false;
  universe = [];

  try {
    // 1) Tickers
    const t = await apiGet("/dashboard/tickers");
    const tickers = Array.isArray(t?.tickers) ? t.tickers : [];

    // 2) Snapshot real por ticker
    const snaps = await Promise.all(
      tickers.map(async ticker => {
        const r = await apiGet(`/dashboard/latest/${ticker}`);
        const d = r?.latest?.result || null;

        return {
          ticker,
          data: d
        };
      })
    );

    universe = snaps.map(x => ({
      ticker: x.ticker,
      recommendation: x.data?.recommendation || "SIN DATOS",
      ret: x.data?.ret_ens_pct ?? null
    }));

    lastRefresh = now;
    render();

  } catch (e) {
    console.error("❌ Universe error", e);
    degraded = true;
    render();
  }
}

// ---------------------------
// Render
// ---------------------------
function render() {
  const tbody = document.querySelector("#universe-table tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  universe.forEach(u => {
    const tr = document.createElement("tr");
    tr.className = "hoverable";
    tr.innerHTML = `
      <td><strong>${u.ticker}</strong></td>
      <td>${fmt(u.recommendation)}</td>
      <td>—</td>
      <td>${fmtReturn(u.ret)}</td>
      <td>—</td>
    `;
    tr.onclick = () => {
      switchTab("analysis");
      loadAnalysis(u.ticker);
    };
    tbody.appendChild(tr);
  });

  const s = document.getElementById("universe-status");
  if (s) {
    s.innerHTML = degraded
      ? "⚠️ Error de backend"
      : `🌍 Universo: <strong>${universe.length}</strong>`;
  }
}

// ---------------------------
// Init
// ---------------------------
export function initUniverse() {
  loadUniverse(true);
  setInterval(() => loadUniverse(true), 5 * 60 * 1000);
}

export default { initUniverse };
