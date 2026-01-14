// js/analysis.js
// =======================================
// 📊 ANÁLISIS MATEMÁTICO PURO (v2.2 FINAL)
// - SOLO predictions
// - Determinístico + reproducible
// - Chart.js con lifecycle correcto
// =======================================

const API = "https://spy-2w-price-prediction.onrender.com";

let chartInstance = null;
let currentTicker = null;

// ---------------------------
// API helper
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

  // KPIs
  setText("ticker-name", ticker);
  setText("rec", last.recommendation || "HOLD");
  setText("pnow", formatMoney(last.price_now));
  setText("ppred", formatMoney(last.price_pred));
  setHTML("ret", formatReturn(last.ret_ens_pct));
  setText("date-pred", formatDate(last.date_base));

  setText("conf", "—");
  setText("quality", "—");

  // Render chart SOLO cuando la pestaña está visible
  requestAnimationFrame(() => {
    renderChart(data, last);
  });

  updateStatus(
    `✅ ${ticker} | ${data.length} predicciones`,
    new Date().toLocaleString("es-CL")
  );
}

// ---------------------------
// Plugin líneas de referencia
// ---------------------------
const referenceLinesPlugin = {
  id: "referenceLines",
  afterDraw(chart) {
    const ctx = chart.ctx;
    const yAxis = chart.scales.y;
    const last = chart.$lastPoint;
    if (!last || !yAxis) return;

    drawLine(ctx, yAxis, last.price_now, "#10b981", true);
    drawLine(ctx, yAxis, last.price_pred, "#38bdf8", false);
  },
};

function drawLine(ctx, yAxis, value, color, dashed) {
  if (value == null) return;
  const y = yAxis.getPixelForValue(value);

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.setLineDash(dashed ? [8, 4] : []);
  ctx.beginPath();
  ctx.moveTo(yAxis.left, y);
  ctx.lineTo(yAxis.right, y);
  ctx.stroke();
  ctx.restore();
}

// ---------------------------
// Chart.js (LIFECYCLE CORRECTO)
// ---------------------------
function renderChart(data, last) {
  if (typeof Chart === "undefined") return;

  const canvas = document.getElementById("chart");
  if (!canvas || canvas.offsetParent === null) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // 🔥 FIX CLAVE
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

export default { loadAnalysis };
