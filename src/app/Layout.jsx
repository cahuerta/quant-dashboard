import { NavLink, Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div className="layout">

      <header className="header">

        <div className="brand">
          <span className="brand-dot" />
          Quant Enterprise
        </div>

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

      <main className="main">
        <Outlet />
      </main>

    </div>
  );
}
