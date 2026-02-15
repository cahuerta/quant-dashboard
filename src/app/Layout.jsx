import { NavLink } from "react-router-dom";

export default function Layout({ children }) {
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

          <NavLink to="/" end className={({ isActive }) =>
            isActive ? "nav-link active" : "nav-link"
          }>
            Resumen
          </NavLink>

          <NavLink to="/universe" className={({ isActive }) =>
            isActive ? "nav-link active" : "nav-link"
          }>
            Universo
          </NavLink>

          <NavLink to="/universe-cl" className={({ isActive }) =>
            isActive ? "nav-link active" : "nav-link"
          }>
            Universo Chile
          </NavLink>

          <NavLink to="/signals" className={({ isActive }) =>
            isActive ? "nav-link active" : "nav-link"
          }>
            Señales
          </NavLink>

          <NavLink to="/screener" className={({ isActive }) =>
            isActive ? "nav-link active" : "nav-link"
          }>
            Screener
          </NavLink>

          <NavLink to="/portfolio" className={({ isActive }) =>
            isActive ? "nav-link active" : "nav-link"
          }>
            Portafolio
          </NavLink>

          <NavLink to="/risk" className={({ isActive }) =>
            isActive ? "nav-link active" : "nav-link"
          }>
            Risk
          </NavLink>

          <NavLink to="/market" className={({ isActive }) =>
            isActive ? "nav-link active" : "nav-link"
          }>
            Market
          </NavLink>

        </nav>

      </header>

      {/* ================= CONTENT ================= */}
      <main className="main">
        {children}
      </main>

    </div>
  );
}
