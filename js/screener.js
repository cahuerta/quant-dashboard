// js/screener.js
// =====================================================
// 🧪 Screener Viewer (READ ONLY)
// Fuente: /dashboard/screener
// =====================================================

const API = "https://spy-2w-price-prediction.onrender.com";

export async function initScreener() {
  const table = document.querySelector("#screener-table tbody");
  const meta = document.getElementById("screener-meta");

  if (!table) return;

  try {
    const res = await fetch(`${API}/dashboard/screener`, {
      cache: "no-cache",
      headers: { Accept: "application/json" }
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const c = data.candidates || [];

    meta.textContent =
      `Generado: ${data.generated_at} · ` +
      `Universe: ${data.n_universe} · ` +
      `Candidatos: ${c.length} · ` +
      `IA: ${data.ia_available ? "ON" : "OFF"}`;

    if (!c.length) {
      table.innerHTML =
        `<tr><td colspan="10">Sin candidatos (filtros estrictos)</td></tr>`;
      return;
    }

    table.innerHTML = c.map((x, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${x.ticker}</strong></td>
        <td>${x.score}</td>
        <td>${x.quality}</td>
        <td>${x.rsi_wilder}</td>
        <td>${x.sharpe_ratio}</td>
        <td>${x.beta_spy}</td>
        <td>${x.volatility}</td>
        <td>${x.trend_3m_pct}%</td>
        <td>${x.fundamental_flag ?? "—"}</td>
      </tr>
    `).join("");

  } catch (e) {
    table.innerHTML =
      `<tr><td colspan="10">Error cargando screener</td></tr>`;
    console.error("Screener load error:", e);
  }
}
