function showTab(tab) {
  document.getElementById("analysis-tab").style.display =
    tab === "analysis" ? "block" : "none";
  document.getElementById("signals-tab").style.display =
    tab === "signals" ? "block" : "none";

  if (tab === "signals") loadSignals();
}
