// js/signals.js

import { apiGet } from "./api.js";
import { loadSignal } from "./analysis.js";

// =====================
// CARGAR TABLA DE SEÑALES
// =====================
export async function loadSignals() {
  const d = await apiGet("/signals?min_confidence=0");

  const tbody = document.querySelector("#signals-table tbody");
  tbody.innerHTML = "";

  d.signals.forEach(s => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${s.ticker}</td>
      <td>${s.quality}</td>
      <td>${s.confidence ?? "–"}</td>
      <td>${s.recommendation}</td>
      <td>${s.ret_ens_pct}%</td>
    `;

    tr.addEventListener("click", () => {
      // volver a análisis
      document.getElementById("analysis-tab").style.display = "block";
      document.getElementById("signals-tab").style.display = "none";

      // seleccionar ticker
      const sel = document.getElementById("ticker");
      sel.value = s.ticker;

      // cargar señal
      loadSignal(s.ticker);
    });

    tbody.appendChild(tr);
  });
}
