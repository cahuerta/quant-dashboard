// js/screener.js
// =====================================================
// 🧪 Screener Viewer (READ ONLY)
// Fuente: /dashboard/screener
// Adaptado al nuevo contrato del backend
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

    const candidates = data.candidates_strict || [];
    const topGlobal = data.top20_global || [];

    meta.textContent =
      `Generado: ${data.generated_at ?? "—"} · ` +
      `Evaluados: ${data.n_evaluated ?? 0} · ` +
      `Candidatos: ${candidates.length}`;

    let rows = [];

    // =================================================
    // 1️⃣ CANDIDATOS ESTRICTOS
    // =================================================
    if (candidates.length) {
      rows.push(
        ...candidates.map((x, i) => renderRow(x, i + 1))
      );
    } else {
      rows.push(`
        <tr class="muted">
          <td colspan="10">Sin candidatos (filtros estrictos)</td>
        </tr>
      `);
    }

    // =================================================
    // 2️⃣ SEPARADOR
    // =================================================
    rows.push(`
      <tr class="separator">
        <td colspan="10">
          <strong>Top 20 mejor score (ranking global)</strong>
        </td>
      </tr>
    `);

    // =================================================
    // 3️⃣ TOP GLOBAL (SIEMPRE)
    // =================================================
    if (!topGlobal.length) {
      rows.push(`
        <tr class="muted">
          <td colspan="10">No hay datos suficientes</td>
        </tr>
      `);
    } else {
      rows.push(
        ...topGlobal.map((x, i) => renderRow(x, i + 1))
      );
    }

    table.innerHTML = rows.join("");

  } catch (e) {
    table.innerHTML =
      `<tr><td colspan="10">Error cargando screener</td></tr>`;
    console.error("Screener load error:", e);
  }
}

// =====================================================
// Helper render fila
// =====================================================
function renderRow(x, rank) {
  return `
    <tr>
      <td>${rank}</td>
      <td><strong>${x.ticker}</strong></td>
      <td>${x.score ?? "—"}</td>
      <td>${x.quality ?? "—"}</td>
      <td>${x.rsi_wilder ?? "—"}</td>
      <td>${x.sharpe_ratio ?? "—"}</td>
      <td>${x.beta_spy ?? "—"}</td>
      <td>${x.volatility ?? "—"}</td>
      <td>${x.trend_3m_pct ?? "—"}%</td>
      <td>
        —
      </td>
    </tr>
  `;
}
