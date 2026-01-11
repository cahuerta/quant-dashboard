// js/tabs.js

import { initAnalysis } from "./analysis.js";
import { loadSignals } from "./signals.js";

// =====================
// TAB LOGIC
// =====================
function showTab(tab) {
  document.getElementById("analysis-tab").style.display =
    tab === "analysis" ? "block" : "none";

  document.getElementById("signals-tab").style.display =
    tab === "signals" ? "block" : "none";

  if (tab === "signals") {
    loadSignals();
  }
}

// =====================
// INIT
// =====================
document.addEventListener("DOMContentLoaded", () => {
  // Activar botones de tabs
  document.querySelectorAll(".tabs button").forEach(btn => {
    btn.addEventListener("click", () => {
      showTab(btn.dataset.tab);
    });
  });

  // Tab inicial
  showTab("analysis");

  // Inicializar análisis
  initAnalysis();
});
