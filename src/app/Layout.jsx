import { NavLink } from "react-router-dom";

export default function Layout({ children }) {
  return (
    <div className="layout">

      {/* ================= HEADER ================= */}
      <header className="header">

        {/* ===== Brand ===== */}
        <div className="brand">
          <span className="brand-dot" />
          Quant Enterprise
        </div>

        {/* ===== Navigation ===== */}
        <nav className="nav">

          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            Global
          </NavLink>

          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            Dashboard
          </NavLink>

          <NavLink
            to="/universe"
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            Universe
          </NavLink>

          <NavLink
            to="/market"
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            Market
          </NavLink>

          <NavLink
            to="/signals"
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            Signals
          </NavLink>

          <NavLink
            to="/system"
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            System
          </NavLink>

        </nav>

        {/* ===== Market Status (placeholder real-time) ===== */}
        <div className="header-info">
          <div className="status-item">
            <span className="status-label">Market</span>
            <span className="status-value neutral">—</span>
          </div>

          <div className="status-item">
            <span className="status-label">Risk</span>
            <span className="status-value low">—</span>
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
