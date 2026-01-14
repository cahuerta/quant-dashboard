// js/analysis.js
// =======================================
// 📊 ANÁLISIS MATEMÁTICO PURO (v2.1 FINAL)
// - SOLO predictions (histórico calculado)
// - NO señales | NO confianza | NO decisiones
// - Determinístico + reproducible
// - Chart con líneas de referencia
// =======================================

const API = "https://spy-2w-price-prediction.onrender.com";

let chartInstance = null;
let currentTicker = null;

// ---------------------------
// API helper (defensivo)
// ---------------------------
async function apiGet(url, params = {}) {
  const urlParams = new URLSearchParams(params);
  const fullUrl = `${API}${url}${urlParams.toString() ? `?${urlParams}` : ""}`;

  try {
    const res = await fetch(fullUrl, {
      cache: "no-cache",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error(`❌ API error: ${url}`, err);
    return null;
  }
}

// ---------------------------
// Formatters
// ---------------------------
function formatMoney(v) {
  if (v == null) return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return "—";
  return `$${n.toLocaleString("es-CL")}`;
}

function formatReturn(v) {
  if (v == null) return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return "—";
  const color = n >= 0 ? "#10b981" : "#ef4444";
  return `<span style="color:${color};font-weight:600">${n.toFixed(1)}%</span>`;
}

function formatDate(v) {
  if (v == null) return "—";
  try {
    return new Date(v).toLocaleDateString("es-CL");
  } catch {
    return "—";
  }
}

// ---------------------------
// Render principal
// ---------------------------
export async function loadAnalysis(ticker) {
  if (!ticker) return;

  try {
    currentTicker = ticker;
    updateStatus(`📊 Analizando ${ticker}…`, "—");

    clearAnalysis(false);

    const res = await apiGet("/dashboard/predictions/summary", { ticker });

    if (!res?.data?.length) {
      updateStatus(`❌ Sin datos para ${ticker}`, new Date().toLocaleString("es-CL"));
      clearAnalysis(true);
      return;
    }

    const data = res.data;
    const last = data[data.length - 1];

    setText("ticker-name", ticker);
    setText("rec", last.recommendation || "HOLD");
    setText("pnow", formatMoney(last.price_now));
    setText("ppred", formatMoney(last.price_pred));
    setHTML("ret", formatReturn(last.ret_ens_pct));
    setText("date-pred", formatDate(last.date_base));

    setText("conf", "—");
    setText("quality", "—");

    setText(
      "chart-info",
      `Modelo matemático • ${data.length} predicciones históricas`
    );

    // FIX: esperar frame + visibilidad real
    requestAnimationFrame(() => {
      renderChart(data, last);
    });

    updateStatus(
      `✅ ${ticker} | ${data.length} predicciones`,
      new Date().toLocaleString("es-CL")
    );
  } catch (err) {
    console.error(`❌ Error análisis ${ticker}:`, err);
    updateStatus(`❌ Error: ${ticker}`, new Date().toLocaleString("es-CL"));
    clearAnalysis(true);
  }
}

// ---------------------------
// Chart.js con referencias
// ---------------------------
const referenceLinesPlugin = {
  id: "referenceLines",
  afterDraw(chart) {
    const ctx = chart.ctx;
    const yAxis = chart.scales.y;
    const last = chart.$lastPoint;
    if (!last || !yAxis) return;

    if (last.price_now != null) {
      const y = yAxis.getPixelForValue(last.price_now);
      ctx.save();
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      ctx.moveTo(yAxis.left, y);
      ctx.lineTo(yAxis.right, y);
      ctx.stroke();
      ctx.restore();
    }

    if (last.price_pred != null) {
      const y = yAxis.getPixelForValue(last.price_pred);
      ctx.save();
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(yAxis.left, y);
      ctx.lineTo(yAxis.right, y);
      ctx.stroke();
      ctx.restore();
    }
  },
};

function renderChart(data, last) {
  if (typeof Chart === "undefined") return;

  const canvas = document.getElementById("chart");
  if (!canvas) return;

  // FIX: no renderizar si está oculto (tab inactive)
  if (canvas.offsetParent === null) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  chartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: data.map(d => formatDate(d.date_base)),
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
        tooltip: { mode: "index", intersect: false },
      },
      scales: {
        x: { grid: { color: "rgba(0,0,0,0.05)" } },
        y: { grid: { color: "rgba(0,0,0,0.05)" } },
      },
    },
    plugins: [referenceLinesPlugin],
  });

  chartInstance.$lastPoint = last;

  // FIX: forzar recálculo de tamaño
  setTimeout(() => {
    chartInstance?.resize();
  }, 0);
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
    "conf",
    "quality",
    "ticker-name",
    "date-pred",
    "chart-info",
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

export function getChartData() {
  return chartInstance?.data || null;
}

export default {
  loadAnalysis,
  getCurrentTicker,
  getChartData,
};
