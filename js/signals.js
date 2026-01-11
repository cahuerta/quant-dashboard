async function loadSignals() {
  const d = await apiGet("/signals?min_confidence=0");
  const tbody = document.querySelector("#signals-table tbody");
  tbody.innerHTML = "";

  d.signals.forEach(s => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${s.ticker}</td>
      <td>${s.quality}</td>
      <td>${s.confidence ?? "–"}</td>
      <td>${s.recommendation}</td>
      <td>${s.ret_ens_pct}%</td>
    `;
    tr.onclick = () => {
      showTab("analysis");
      document.getElementById("ticker").value = s.ticker;
      loadSignal(s.ticker);
    };
    tbody.appendChild(tr);
  });
}
