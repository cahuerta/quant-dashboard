// js/universe.js
// =======================================
// 🌍 UNIVERSO DEL SISTEMA (BACKEND-ALIGNED)
// OBSERVADOR PURO DEL BACKEND
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
// Formatters
// ---------------------------
function formatReturn(v) {
  if (v == null) return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return "—";
  const color = n >= 0 ? "#10b981" : "#ef4444";
  return `<span style="color:${color};font-weight:600">${n.toFixed(2)}%</span>`;
}

function formatConfidence(ret) {
  if (ret == null) return "—";
  return `${Math.min(100, Math.round(Math.abs(ret) * 20))}%`;
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
    console.log("🌍 Cargando universo (alineado backend)…");

    // 1️⃣ Obtener tickers
    const tickersRes = await apiGet("/dashboard/tickers");
    const tickers = Array.isArray(tickersRes?.tickers)
      ? tickersRes.tickers
      : [];

    // 2️⃣ Leer snapshot REAL del backend
    const snapshots = await Promise.all(
      tickers.map(async ticker => {
        const r = await apiGet(`/dashboard/latest/${ticker}`);
        const result = r?.latest?.result || null;

        return {
          ticker,
          recommendation: result?.recommendation ?? "SIN DATOS",
          ret: result?.ret_ens_pct ?? null
        };
      })
    );

    universe = snapshots;
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
      <td><strong>${u.ticker}</strong></td>
      <td>${u.recommendation}</td>
      <td>${formatConfidence(u.ret)}</td>
      <td>${formatReturn(u.ret)}</td>
      <td>—</td>
    `;

    tr.onclick = () => {
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
    el.textContent = "⚠️ Universo no disponible";
    el.style.color = "#f59e0b";
    return;
  }

  el.innerHTML = `🌍 Universo: <strong>${universe.length}</strong>`;
}

// ---------------------------
// Init
// ---------------------------
export function initUniverse() {
  loadUniverse(true);
  setInterval(() => loadUniverse(true), 5 * 60 * 1000);
}
