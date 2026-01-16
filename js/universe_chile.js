// js/universe_chile.js
// =======================================
// 🇨🇱 UNIVERSE CHILE (IPSA)
// - Reutiliza el MISMO backend que Universe
// - Filtra SOLO tickers chilenos (.SN)
// - No llama screener
// - Sin lógica de negocio
// =======================================

const API_BASE = ""; // mismo origen

function fmtPrice(v) {
  if (v == null || Number.isNaN(Number(v))) return "—";
  return `$${Number(v).toFixed(2)}`;
}

function fmtPct(v) {
  if (v == null || Number.isNaN(Number(v))) return "—";
  const n = Number(v);
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

// Fetch único (mismo endpoint que Universe)
async function fetchSignals() {
  const res = await fetch(`${API_BASE}/signals`, {
    cache: "no-cache",
    headers: { Accept: "application/json" }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

// Inicializador público
export async function initUniverseChile() {
  const table = document.querySelector("#universe-cl-table");
  if (!table) return;

  const tbody = table.querySelector("tbody");
  tbody.innerHTML = `<tr><td colspan="7">Cargando universo Chile…</td></tr>`;

  try {
    const data = await fetchSignals();

    // Filtrar SOLO Chile (.SN)
    const chile = Array.isArray(data)
      ? data.filter(s => typeof s.ticker === "string" && s.ticker.endsWith(".SN"))
      : [];

    tbody.innerHTML = "";

    if (chile.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7">Sin datos de Chile</td></tr>`;
      return;
    }

    for (const s of chile) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${s.ticker}</td>
        <td>${s.recommendation ?? "—"}</td>
        <td>${fmtPrice(s.price_now)}</td>
        <td>${fmtPrice(s.price_pred)}</td>
        <td>${s.quality ?? "—"}</td>
        <td>${fmtPct(s.ret_ens_pct)}</td>
        <td>${s.fundamental_flag ?? "—"}</td>
      `;
      tbody.appendChild(tr);
    }
  } catch (e) {
    console.error("❌ Universe Chile error:", e);
    tbody.innerHTML = `<tr><td colspan="7">Error cargando Chile</td></tr>`;
  }
}

export default { initUniverseChile };
