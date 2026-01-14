// js/universe.js
// =====================================================
// 🌍 UNIVERSO DEL SISTEMA (BACKEND-ALIGNED)
// - Fuente: /dashboard/tickers
// - Fuente: /dashboard/latest/{ticker}
// - Lee SOLO: latest.result
// - Tolerante a fallos parciales
// =====================================================

import { switchTab } from "./tabs.js";
import { loadAnalysis } from "./analysis.js";

// 🔑 Backend REAL
const API = "https://spy-2w-price-prediction.onrender.com";

let universe = [];
let lastRefresh = 0;

// -----------------------------------------------------
// API helper (NO marca error global)
// -----------------------------------------------------
async function apiGet(url) {
  try {
    const res = await fetch(`${API}${url}`, {
      cache: "no-cache",
      headers: { Accept: "application/json" }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("API warning:", url, err.message);
    return null; // ⚠️ fallo local, NO global
  }
}

// -----------------------------------------------------
// Formatters
// -----------------------------------------------------
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

// -----------------------------------------------------
// Load universe
// -----------------------------------------------------
export async function loadUniverse(force = false) {
  const now = Date.now();
  if (!force && now - lastRefresh < 5 * 60 * 1000) {
    render();
    return;
  }

  universe = [];

  // 1️⃣ Obtener tickers
  const t = await apiGet("/dashboard/tickers");
  const tickers = Array.isArray(t?.tickers) ? t.tickers : [];

  // 2️⃣ Obtener snapshots (tolerante)
  const results = await Promise.allSettled(
    tickers.map(async ticker => {
      const r = await apiGet(`/dashboard/latest/${ticker}`);
      const d = r?.latest?.result || null;
      return { ticker, data: d };
    })
  );

  universe = results.map((res, i) => {
    if (res.status === "fulfilled") {
      const d = res.value.data;
      return {
        ticker: res.value.ticker,
        recommendation: d?.recommendation ?? "SIN DATOS",
        ret: d?.ret_ens_pct ?? null
      };
    }
    // fallo individual
    return {
      ticker: tickers[i],
      recommendation: "SIN DATOS",
      ret: null
    };
  });

  lastRefresh = now;
  render();
}

// -----------------------------------------------------
// Render
// -----------------------------------------------------
function render() {
  const tbody = document.querySelector("#universe-table tbody");
  const status = document.getElementById("universe-status");
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

  if (status) {
    status.innerHTML = `🌍 Universo: <strong>${universe.length}</strong>`;
  }
}

// -----------------------------------------------------
// Init
// -----------------------------------------------------
export function initUniverse() {
  loadUniverse(true);
  setInterval(() => loadUniverse(true), 5 * 60 * 1000);
}

export default { initUniverse };
