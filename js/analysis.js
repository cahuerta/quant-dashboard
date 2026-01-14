// js/analysis.js
// =======================================
// 📊 ANÁLISIS MATEMÁTICO (USUARIO FINAL)
// - SIEMPRE muestra datos si existen
// - Compatible con backend REAL en 2 formas:
//   A) latest.latest.result.prediction
//   B) latest.latest.result (campos directos + meta)
// - Usa summary + latest
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
  if (Number.isNaN(n)) return "—";
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

  // 🔑 Dos fuentes
  const [summary, latest] = await Promise.all([
    apiGet("/dashboard/predictions/summary", { ticker }),
    apiGet(`/dashboard/latest/${ticker}`),
  ]);

  const series = summary?.data || [];

  // =====================================================
  // ✅ COMPATIBILIDAD TOTAL CON BACKEND REAL
  // - Forma A (antigua): result.prediction
  // - Forma B (nueva):  result (campos directos + meta)
  // =====================================================
  const result = latest?.latest?.result || {};
  const pred = result?.prediction || result; // <-- CLAVE: no rompe lo anterior
  const meta = result?.meta || pred?.meta || {};
  const hist =
    result?.historical ||
    pred?.historical ||
    {}; // puede vivir en result o pred

  // ---------------------------
  // Resultado principal
  // ---------------------------
  setText("ticker-name", ticker);
  setText("date-pred", date(pred?.date_base || result?.date_base));

  setText("rec", pred?.recommendation || "—");
  setText("pnow", money(pred?.price_now));
  setText("ppred", money(pred?.price_pred));
  setHTML("ret", pct(pred?.ret_ens_pct));

  // ---------------------------
  // Confiabilidad (lenguaje humano)
  // ---------------------------
  const r2 =
    pred?.r2 ??
    pred?.r2_global ??
    result?.r2 ??
    result?.r2_global ??
    null;

  const mae =
    pred?.mae ??
    result?.mae ??
    null;

  const rmse =
    pred?.rmse ??
    result?.rmse ??
    null;

  setText(
    "model-explains",
    r2 != null ? `${Math.round(Number(r2) * 100)}% del movimiento histórico` : "—"
  );

  setText(
    "model-error-avg",
    mae != null ? `±${Number(mae).toFixed(3)}` : "—"
  );

  setText(
    "model-error-max",
    rmse != null ? `±${Number(rmse).toFixed(3)}` : "—"
  );

  // ---------------------------
  // Cómo se calculó
  // ---------------------------
  const horizon =
    pred?.horizon_days ??
    meta?.horizon_days ??
    null;

  setText("horizon", horizon != null ? `${horizon} días` : "—");

  // nombres distintos según backend
  const nFeatures = pred?.n_features ?? result?.n_features ?? null;
  const pcaEff =
    pred?.pca_dims_effective ??
    pred?.pca_dims ??
    result?.pca_dims_effective ??
    result?.pca_dims ??
    null;

  setText(
    "features-used",
    nFeatures != null ? `${nFeatures} variables de mercado` : "—"
  );

  setText(
    "features-effective",
    pcaEff != null ? `${pcaEff} variables relevantes` : "—"
  );

  setText(
    "windows-used",
    hist?.n_windows != null ? `${hist.n_windows} escenarios históricos` : "—"
  );

  setText(
    "rows-used",
    hist?.n_rows != null ? `${hist.n_rows} días de información` : "—"
  );

  // ---------------------------
  // Chart (si hay serie)
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
      labels: data.map((d) => date(d.date_base)),
      datasets: [
        {
          label: "Precio proyectado",
          data: data.map((d) => d.price_pred),
          borderColor: "#38bdf8",
          backgroundColor: "rgba(56,189,248,.08)",
          borderWidth: 3,
          tension: 0.35,
          fill: true,
          pointRadius: 0,
        },
        {
          label: "Precio actual",
          data: data.map((d) => d.price_now ?? null),
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
    "rec",
    "pnow",
    "ppred",
    "ret",
    "ticker-name",
    "date-pred",
    "model-explains",
    "model-error-avg",
    "model-error-max",
    "horizon",
    "features-used",
    "features-effective",
    "windows-used",
    "rows-used",
  ].forEach((id) => setText(id, "—"));

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
