// js/analysis.js
// =======================================
// 📊 ANÁLISIS MATEMÁTICO (USUARIO FINAL)
// - Adaptado 100% al backend REAL
// - Usa summary + latest
// - Lenguaje humano
// - HTML intacto
// =======================================

const API = "https://spy-2w-price-prediction.onrender.com";

let chartInstance = null;
let currentTicker = null;

// ---------------------------
// API helpers
// ---------------------------
async function apiGet(url, params = {}) {
  const qs = new URLSearchParams(params);
  const full = `${API}${url}${qs.toString() ? `?${qs}` : ""}`;

  try {
    const res = await fetch(full, {
      cache: "no-cache",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    console.error("API error:", full, e);
    return null;
  }
}

// ---------------------------
// Formatters (humanos)
// ---------------------------
function money(v) {
  if (v == null) return "—";
  return `$${Number(v).toLocaleString("es-CL", { maximumFractionDigits: 2 })}`;
}

function pct(v) {
  if (v == null) return "—";
  const n = Number(v);
  const color = n >= 0 ? "#16a34a" : "#dc2626";
  return `<span style="color:${color};font-weight:600">${n.toFixed(1)}%</span>`;
}

function date(v) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("es-CL");
}

// ---------------------------
// Selector
// ---------------------------
export async function initAnalysisSelector() {
  const sel = document.getElementById("ticker-select");
  if (!sel) return;

  const t = await apiGet("/dashboard/tickers");
  const tickers = Array.isArray(t?.tickers) ? t.tickers : [];

  sel.innerHTML = "";
  tickers.forEach((tk) => {
    const o = document.createElement("option");
    o.value = tk;
    o.textContent = tk;
    sel.appendChild(o);
  });

  sel.onchange = () => loadAnalysis(sel.value);

  if (tickers.length) {
    sel.value = tickers[0];
    loadAnalysis(tickers[0]);
  }
}

// ---------------------------
// Render principal
// ---------------------------
export async function loadAnalysis(ticker) {
  if (!ticker) return;

  currentTicker = ticker;

  const sel = document.getElementById("ticker-select");
  if (sel && sel.value !== ticker) sel.value = ticker;

  updateStatus(`📊 Analizando ${ticker}…`, "—");
  clearAnalysis(false);

  // 🔑 Dos fuentes reales
  const [summary, latest] = await Promise.all([
    apiGet("/dashboard/predictions/summary", { ticker }),
    apiGet(`/dashboard/latest/${ticker}`),
  ]);

  const series = summary?.data || [];

  // 🔥 BACKEND REAL
  const result = latest?.latest?.result || {};
  const meta = result?.meta || {};
  const hist = result?.historical || {};

  // ---------------------------
  // Resultado principal
  // ---------------------------
  setText("ticker-name", ticker);
  setText("date-pred", date(result?.date_base));

  setText("rec", result?.recommendation || "—");
  setText("pnow", money(result?.price_now));
  setText("ppred", money(result?.price_pred));
  setHTML("ret", pct(result?.ret_ens_pct));

  // ---------------------------
  // Confiabilidad del modelo
  // ---------------------------
  setText(
    "model-explains",
    result?.r2_global != null
      ? `${Math.round(result.r2_global * 100)}% del movimiento histórico`
      : "—"
  );

  setText(
    "model-error-avg",
    result?.mae != null ? `±${result.mae.toFixed(3)}` : "—"
  );

  setText(
    "model-error-max",
    result?.rmse != null ? `±${result.rmse.toFixed(3)}` : "—"
  );

  // ---------------------------
  // Cómo se calculó
  // ---------------------------
  setText(
    "horizon",
    meta?.horizon_days != null ? `${meta.horizon_days} días` : "—"
  );

  setText(
    "features-used",
    result?.n_features != null
      ? `${result.n_features} variables de mercado`
      : "—"
  );

  setText(
    "features-effective",
    result?.pca_dims != null
      ? `${result.pca_dims} variables relevantes`
      : "—"
  );

  setText(
    "windows-used",
    hist?.n_windows != null
      ? `${hist.n_windows} escenarios históricos`
      : "—"
  );

  // ⚠️ El backend NO entrega n_rows
  setText("rows-used", "—");

  // ---------------------------
  // Chart
  // ---------------------------
  if (series.length) {
    requestAnimationFrame(() => renderChart(series));
  }

  updateStatus(
    `✅ ${ticker} | análisis completo`,
    new Date().toLocaleString("es-CL")
  );
}

// ---------------------------
// Chart.js
// ---------------------------
function renderChart(data) {
  if (typeof Chart === "undefined") return;

  const canvas = document.getElementById("chart");
  if (!canvas || canvas.offsetParent === null) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  chartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: data.map(d => date(d.date_base)),
      datasets: [
        {
          label: "Precio proyectado",
          data: data.map(d => d.price_pred),
          borderColor: "#38bdf8",
          backgroundColor: "rgba(56,189,248,.08)",
          borderWidth: 3,
          tension: 0.35,
          fill: true,
          pointRadius: 0,
        },
        {
          label: "Precio actual",
          data: data.map(d => d.price_now ?? null),
          borderColor: "#10b981",
          borderWidth: 2,
          tension: 0.25,
          fill: false,
          pointRadius: 3,
          borderDash: [5, 5],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: "index" },
      plugins: {
        legend: { display: true, position: "top" },
      },
      scales: {
        x: { grid: { color: "rgba(0,0,0,0.05)" } },
        y: { grid: { color: "rgba(0,0,0,0.05)" } },
      },
    },
  });

  setTimeout(() => chartInstance?.resize(), 0);
}

// ---------------------------
// DOM helpers
// ---------------------------
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value ?? "—";
}

function setHTML(id, value) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = value ?? "—";
}

function clearAnalysis(destroyChart = false) {
  [
    "rec","pnow","ppred","ret","ticker-name","date-pred",
    "model-explains","model-error-avg","model-error-max",
    "horizon","features-used","features-effective",
    "windows-used","rows-used"
  ].forEach(id => setText(id, "—"));

  if (destroyChart && chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
}

function updateStatus(msg, ts) {
  const s = document.getElementById("status");
  const t = document.getElementById("last-update");
  if (s) s.textContent = msg;
  if (t) t.textContent = ts;
}

// ---------------------------
// API pública
// ---------------------------
export function getCurrentTicker() {
  return currentTicker;
}

export default {
  initAnalysisSelector,
  loadAnalysis,
  getCurrentTicker,
};
