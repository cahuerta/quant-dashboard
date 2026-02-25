import { NavLink, Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div className="layout">

      {/* HEADER */}
      <header className="header">

        {/* BRAND */}
        <div className="brand">
          <div className="brand-dot" />
          Quant Enterprise
        </div>

        {/* NAV */}
        <nav className="nav">

          <NavLink to="/" className={({isActive}) => navClass(isActive)}>
            <span className="nav-icon">📊</span>
            Resumen
          </NavLink>

          <NavLink to="/universe" className={({isActive}) => navClass(isActive)}>
            <span className="nav-icon">🌍</span>
            Universo
          </NavLink>

          <NavLink to="/universe-cl" className={({isActive}) => navClass(isActive)}>
            <span className="nav-icon">🇨🇱</span>
            Chile
          </NavLink>

          <NavLink to="/signals" className={({isActive}) => navClass(isActive)}>
            <span className="nav-icon">📡</span>
            Signals
          </NavLink>

          <NavLink to="/screener" className={({isActive}) => navClass(isActive)}>
            <span className="nav-icon">🔎</span>
            Screener
          </NavLink>

          <NavLink to="/portfolio" className={({isActive}) => navClass(isActive)}>
            <span className="nav-icon">💼</span>
            Portafolio
          </NavLink>
          <NavLink to="/positions">Posiciones Activas</NavLink>

          <NavLink to="/analysis" className={({isActive}) => navClass(isActive)}>
            <span className="nav-icon">📈</span>
            Análisis
          </NavLink>

        </nav>

      </header>

      {/* MAIN */}
      <main className="main">
        <Outlet />
      </main>

    </div>
  );
}

function navClass(isActive) {
  return isActive ? "nav-link active" : "nav-link";
}
