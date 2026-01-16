// js/tabs.js
// =======================================
// 🧭 TABS ORCHESTRATOR (PRODUCTION READY)
// =======================================

import { initUniverse } from "./universe.js";
import { initUniverseChile } from "./universe_chile.js"; // ✅ NUEVO
import { loadAnalysis } from "./analysis.js";
import { initSignals } from "./signals.js";
import { initScreener } from "./screener.js";

// ---------------------------
// Estado interno
// ---------------------------
let currentTab = null;

let initialized = {
  universe: false,
  "universe-cl": false, // ✅ NUEVO
  analysis: false,
  signals: false,
  screener: false
};

// Tabs válidos (contrato explícito)
const VALID_TABS = [
  "universe",
  "universe-cl", // ✅ NUEVO
  "analysis",
  "signals",
  "screener"
];

const STORAGE_KEY = "quant_active_tab";

// ---------------------------
// Switch visual de tabs
// ---------------------------
export function switchTab(tabName) {
  if (!VALID_TABS.includes(tabName)) {
    console.warn(
      `❌ Tab inválido ignorado: "${tabName}". Válidos: ${VALID_TABS.join(", ")}`
    );
    return;
  }

  if (tabName === currentTab) return;

  currentTab = tabName;
  localStorage.setItem(STORAGE_KEY, tabName);

  // Ocultar todas las secciones
  document.querySelectorAll("[data-tab-content]").forEach(section => {
    section.style.display = "none";
  });

  // Mostrar sección activa
  const activeSection = document.querySelector(
    `[data-tab-content="${tabName}"]`
  );

  if (activeSection) {
    activeSection.style.display = "block";
  } else {
    console.warn(
      `⚠️ Sección no encontrada: [data-tab-content="${tabName}"]`
    );
  }

  // Estado visual botones
  document.querySelectorAll("[data-tab-btn]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tabBtn === tabName);
  });

  // Inicialización perezosa
  initTab(tabName);
}

// ---------------------------
// Inicialización perezosa
// ---------------------------
function initTab(tabName) {
  switch (tabName) {
    case "universe":
      if (!initialized.universe) {
        console.log("🌍 Inicializando Universe…");
        initUniverse();
        initialized.universe = true;
      }
      break;

    case "universe-cl": // ✅ NUEVO
      if (!initialized["universe-cl"]) {
        console.log("🇨🇱 Inicializando Universe Chile…");
        initUniverseChile();
        initialized["universe-cl"] = true;
      }
      break;

    case "analysis":
      if (!initialized.analysis) {
        initialized.analysis = true;
      }
      break;

    case "signals":
      if (!initialized.signals) {
        console.log("🚨 Inicializando Signals…");
        initSignals();
        initialized.signals = true;
      }
      break;

    case "screener":
      if (!initialized.screener) {
        console.log("🧪 Inicializando Screener…");
        initScreener();
        initialized.screener = true;
      }
      break;
  }
}

// ---------------------------
// Setup botones tabs
// ---------------------------
function setupTabButtons() {
  document.querySelectorAll("[data-tab-btn]").forEach(btn => {
    btn.addEventListener("click", e => {
      e.preventDefault();
      switchTab(btn.dataset.tabBtn);
    });
  });
}

// ---------------------------
// Bootstrap principal
// ---------------------------
document.addEventListener("DOMContentLoaded", () => {
  console.log("🧭 Tabs inicializando…");

  setupTabButtons();

  const savedTab = localStorage.getItem(STORAGE_KEY);
  const initialTab =
    savedTab && VALID_TABS.includes(savedTab) ? savedTab : "universe";

  switchTab(initialTab);

  // Deep-link: ?ticker=KO → Analysis directo
  const params = new URLSearchParams(window.location.search);
  const tickerParam = params.get("ticker");

  if (tickerParam) {
    setTimeout(() => {
      console.log(`🎯 Deep link → analysis (${tickerParam})`);
      switchTab("analysis");
      loadAnalysis(tickerParam);
    }, 300);
  }
});

// ---------------------------
// API pública mínima
// ---------------------------
export function getCurrentTab() {
  return currentTab;
}

export function isTabInitialized(tabName) {
  return Boolean(initialized[tabName]);
}

// ---------------------------
// Reset (útil para hot-reload dev)
// ---------------------------
export function resetTabs() {
  currentTab = null;
  Object.keys(initialized).forEach(k => (initialized[k] = false));
  localStorage.removeItem(STORAGE_KEY);
}

export default {
  switchTab,
  getCurrentTab,
  isTabInitialized,
  resetTabs
};
