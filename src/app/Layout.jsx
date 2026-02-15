import { NavLink } from "react-router-dom";

export default function Layout({ children })) {
  return (
    <div className="layout">

      {/* ================= HEADER ================= */}
      <header className="header">

        {/* Brand */}
        <div className="brand">
          <span className="brand-dot" />
          Quant Enterprise
        </div>

        {/* Navigation */}
        <nav className="nav">
          <NavLink to="/" end className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
            Global
          </NavLink>

          <NavLink to="/dashboard" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
            Dashboard
          </NavLink>
        </nav>

        {/* Market Status */}
        <div className="header-info">
          <div className="status-item">
            <span className="status-label">Market</span>
            <span className="status-value neutral">Neutral</span>
          </div>

          <div className="status-item">
            <span className="status-label">Risk</span>
            <span className="status-value low">Low</span>
          </div>
        </div>

      </header>

      {/* ================= CONTENT ================= */}
      <main className="main">
        {children}
      </main>

    </div>
  );
}
