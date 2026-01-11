// js/analysis.js

import { apiGet } from "./api.js";

// =====================
// STATE
// =====================
let chart = null;
let SIGNAL_CACHE = null;

// =====================
// HELPERS DOM
// =====================
const el = id => document.getElementById(id);

// =====================
// DATA
// =====================
async function getSignals() {
  if (!SIGNAL_CACHE) {
    SIGNAL_CACHE = await apiGet("/signals?min_confidence=0");
  }
  return SIGNAL_CACHE;
}

// =====================
// INIT (llamado desde tabs.js)
// =====================
export async function initAnalysis() {
  const sel = el("ticker");

  if (!sel) {
    console.error("❌ #ticker no existe");
    return;
  }

  sel.addEventListener("change", e => loadSignal(e.target.value));
  await loadTickers();
}

// =====================
// LOADERS
// =====================
async function loadTickers() {
  const d = await getSignals();
  const sel = el("ticker");

  sel.innerHTML = `<option value="">Selecciona…</option>`;

  d.signals.forEach(s => {
    const o = document.createElement("option");
    o.value = s.ticker;
    o.textContent = s.ticker;
    sel.appendChild(o);
  });

  el("status").textContent = `✅ ${d.signals.length} activos`;
  el("last-update").textContent = new Date().toLocaleString("es-CL");
}

export async function loadSignal(ticker) {
  if (!ticker) return;

  const d = await getSignals();
  const s = d.signals.find(x => x.ticker === ticker);
  if (!s) return;

  el("rec").textContent = s.recommendation;
  el("pnow").textContent = `$${s.price_now}`;
  el("ppred").textContent = `$${s.price_pred}`;
  el("ret").textContent = `${s.ret_ens_pct}%`;
  el("conf").textContent = s.confidence ?? "–";
  el("quality").textContent = s.quality;

  await loadChart(ticker);
}

async function loadChart(ticker) {
  const pred = await apiGet(`/dashboard/predictions/summary?ticker=${ticker}`);

  const labels = pred.data.map(x => x.date_base);
  const projected = pred.data.map(x => x.price_pred);

  if (chart) chart.destroy();

  chart = new Chart(el("chart"), {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Proyectado",
          data: projected
        }
      ]
    }
  });
}
