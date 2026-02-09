// js/universe_chile.js
// =======================================
// 🇨🇱 UNIVERSE CHILE (IPSA)
// - Reutiliza el MISMO backend que Universe
// - Filtra SOLO tickers chilenos (.SN)
// - No llama screener
// - Sin lógica de negocio
// =======================================

// ✅ 1) Pon el mismo API que Universe (si Universe usa absoluto, acá igual)
const API_BASE = window.API_BASE || ""; 
// Si estás en Vite, cambia a: const API_BASE = import.meta.env.VITE_API_URL;

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

async function fetchSignals() {
  const url = `${API_BASE}/signals`;
  const res = await fetch(url, {
    cache: "no-cache",
    headers: { Accept: "application/json" }
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} on ${url} | ${text.slice(0, 200)}`);
  }
  return await res.json();
}

export async function initUniverseChile() {
  const table = document.querySelector("#universe-cl-table");
  if (!table) {
    console.warn("UniverseChile: no existe #universe-cl-table");
    return;
  }

  const tbody = table.querySelector("tbody");
  if (!tbody) {
    console.warn("UniverseChile: table sin <tbody>");
    return;
  }

  tbody.innerHTML = `<tr><td colspan="7">Cargando universo Chile…</td></tr>`;

  try {
    const data = await fetchSignals();

    // ✅ 2) soporta array o data.signals/items
    const raw = Array.isArray(data) ? data : (data?.signals || data?.items || []);

    const chile = raw.filter(
      s => typeof s?.ticker === "string" && s.ticker.endsWith(".SN")
    );

    tbody.innerHTML = "";

    if (chile.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7">Sin datos de Chile (.SN)</td></tr>`;
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
    tbody.innerHTML = `<tr><td colspan="7">Error cargando Chile: ${String(e.message || e)}</td></tr>`;
  }
}

export default { initUniverseChile };
