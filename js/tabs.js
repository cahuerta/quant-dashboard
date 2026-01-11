// js/tabs.js — Entry point FINAL Quant Dashboard (universo + señales desacoplados)

const API = "https://spy-2w-price-prediction.onrender.com";

class QuantDashboard {
  constructor() {
    this.assets = [];        // UNIVERSO (tickers.json)
    this.signalsCache = [];  // SEÑALES (estado)
    this.currentTicker = null;
    this.chart = null;
    this.init();
  }

  /* =====================
     INIT
     ===================== */
  async init() {
    try {
      this.updateStatus("🔄 Iniciando...", "–");

      // 1️⃣ Universo
      await this.loadAssets();

      // 2️⃣ Señales (estado)
      await this.loadSignalsCache();

      // 3️⃣ UI
      this.setupTickerSelect();
      this.setupTabs();

      // Seleccionar primer activo del universo
      if (this.assets.length > 0) {
        this.currentTicker = this.assets[0].ticker;
        document.getElementById("ticker").value = this.currentTicker;
        await this.loadAnalysis(this.currentTicker);
      }

      this.updateStatus(
        `✅ ${this.assets.length} activos`,
        new Date().toLocaleString("es-CL")
      );
    } catch (err) {
      console.error("Error inicial:", err);
      this.updateStatus("❌ Error de conexión", new Date().toLocaleString("es-CL"));
    }
  }

  /* =====================
     API
     ===================== */
  async apiGet(url) {
    const r = await fetch(API + url);
    if (!r.ok) {
      throw new Error(`HTTP ${r.status} – ${r.statusText}`);
    }
    return r.json();
  }

  /* =====================
     DATA
     ===================== */
  async loadAssets() {
    const d = await this.apiGet("/assets");
    this.assets = Array.isArray(d.assets) ? d.assets : [];
  }

  async loadSignalsCache() {
    const d = await this.apiGet("/signals?min_confidence=0");
    this.signalsCache = Array.isArray(d.signals) ? d.signals : [];
  }

  /* =====================
     HELPERS
     ===================== */
  formatConfidence(c) {
    if (c == null) return "–";
    return c <= 1 ? `${(c * 100).toFixed(0)}%` : `${Number(c).toFixed(0)}%`;
  }

  formatReturn(r) {
    const n = Number(r);
    return isNaN(n) ? "–" : `${n.toFixed(1)}%`;
  }

  getSignalForTicker(ticker) {
    return this.signalsCache.find(s => s.ticker === ticker) || null;
  }

  /* =====================
     UI SETUP
     ===================== */
  setupTickerSelect() {
    const select = document.getElementById("ticker");
    select.innerHTML = "";

    this.assets.forEach(a => {
      const opt = document.createElement("option");
      opt.value = a.ticker;
      opt.textContent = a.ticker;
      select.appendChild(opt);
    });

    select.addEventListener("change", e => {
      this.currentTicker = e.target.value;
      this.loadAnalysis(this.currentTicker);
    });
  }

  setupTabs() {
    document.querySelectorAll(".tabs button").forEach(btn => {
      btn.addEventListener("click", () => {
        this.switchTab(btn.dataset.tab);
      });
    });
    this.switchTab("analysis");
  }

  switchTab(tab) {
    document.getElementById("analysis-tab").style.display =
      tab === "analysis" ? "block" : "none";
    document.getElementById("signals-tab").style.display =
      tab === "signals" ? "block" : "none";

    document.querySelectorAll(".tabs button").forEach(btn =>
      btn.classList.toggle("active", btn.dataset.tab === tab)
    );

    if (tab === "signals") this.loadSignalsTable();
  }

  /* =====================
     ANALYSIS
     ===================== */
  async loadAnalysis(ticker) {
    try {
      this.updateStatus(`Analizando ${ticker}…`, "–");

      const s = this.getSignalForTicker(ticker);

      // KPIs (con o sin señal)
      document.getElementById("rec").textContent =
        s?.recommendation || "–";
      document.getElementById("pnow").textContent =
        s?.price_now != null ? `$${Number(s.price_now).toLocaleString()}` : "–";
      document.getElementById("ppred").textContent =
        s?.price_pred != null ? `$${Number(s.price_pred).toLocaleString()}` : "–";
      document.getElementById("ret").textContent =
        s ? this.formatReturn(s.ret_ens_pct) : "–";
      document.getElementById("conf").textContent =
        s ? this.formatConfidence(s.confidence) : "–";
      document.getElementById("quality").textContent =
        s?.quality || "–";

      document.getElementById("chart-info").textContent =
        `Proyección ${ticker}`;

      await this.loadChart(ticker);

      this.updateStatus(`✅ ${ticker} listo`, new Date().toLocaleString("es-CL"));
    } catch (err) {
      console.error(`Error ${ticker}:`, err);
      this.updateStatus(`❌ Error ${ticker}`, new Date().toLocaleString("es-CL"));
    }
  }

  async loadChart(ticker) {
    const pred = await this.apiGet(
      `/dashboard/predictions/summary?ticker=${ticker}`
    );

    const labels = pred.data?.map(x => x.date_base) || [];
    const projected = pred.data?.map(x => x.price_pred) || [];

    if (this.chart) this.chart.destroy();

    const ctx = document.getElementById("chart").getContext("2d");
    this.chart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: "Precio proyectado",
          data: projected,
          borderColor: "#10b981",
          backgroundColor: "rgba(16,185,129,.12)",
          borderWidth: 3,
          tension: 0.35,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            ticks: {
              callback: v => "$" + Number(v).toLocaleString()
            }
          }
        }
      }
    });
  }

  /* =====================
     SIGNALS TABLE
     ===================== */
  loadSignalsTable() {
    const tbody = document.querySelector("#signals-table tbody");
    tbody.innerHTML = "";

    [...this.signalsCache]
      .sort((a, b) => (b.ret_ens_pct ?? 0) - (a.ret_ens_pct ?? 0))
      .forEach(s => {
        const ret = Number(s.ret_ens_pct);
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><strong>${s.ticker}</strong></td>
          <td>${s.quality || "–"}</td>
          <td>${this.formatConfidence(s.confidence)}</td>
          <td>${s.recommendation || "–"}</td>
          <td style="font-weight:600;color:${ret >= 0 ? "#10b981" : "#ef4444"}">
            ${this.formatReturn(ret)}
          </td>
        `;

        tr.style.cursor = "pointer";
        tr.onclick = () => {
          document.getElementById("ticker").value = s.ticker;
          this.currentTicker = s.ticker;
          this.switchTab("analysis");
          this.loadAnalysis(s.ticker);
        };

        tbody.appendChild(tr);
      });
  }

  /* =====================
     STATUS
     ===================== */
  updateStatus(msg, ts = "–") {
    document.getElementById("status").textContent = msg;
    document.getElementById("last-update").textContent = ts;
  }
}

/* =====================
   BOOT
   ===================== */
document.addEventListener("DOMContentLoaded", () => {
  new QuantDashboard();
});
