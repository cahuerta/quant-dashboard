import { NavLink, Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div className="layout">

      {/* HEADER */}
      <header className="header">

        {/* BRAND */}
        <div className="brand">
          <div className="brand-dot" />
          <span className="brand-text">Quant Enterprise</span>
        </div>

        {/* NAV */}
        <nav className="nav">

          <NavLink to="/" className={({isActive}) => navClass(isActive)}>
            <span className="nav-icon">📊</span>
            <span className="nav-label">Resumen</span>
          </NavLink>

          <NavLink to="/universe" className={({isActive}) => navClass(isActive)}>
            <span className="nav-icon">🌍</span>
            <span className="nav-label">Universo</span>
          </NavLink>

          <NavLink to="/universe-cl" className={({isActive}) => navClass(isActive)}>
            <span className="nav-icon">🇨🇱</span>
            <span className="nav-label">Chile</span>
          </NavLink>

          <NavLink to="/signals" className={({isActive}) => navClass(isActive)}>
            <span className="nav-icon">📡</span>
            <span className="nav-label">Signals</span>
          </NavLink>

          <NavLink to="/screener" className={({isActive}) => navClass(isActive)}>
            <span className="nav-icon">🔎</span>
            <span className="nav-label">Screener</span>
          </NavLink>

          <NavLink to="/portfolio" className={({isActive}) => navClass(isActive)}>
            <span className="nav-icon">💼</span>
            <span className="nav-label">Portafolio</span>
          </NavLink>

          <NavLink to="/positions" className={({isActive}) => navClass(isActive)}>
            <span className="nav-icon">📋</span>
            <span className="nav-label">Posiciones</span>
          </NavLink>

          <NavLink to="/analysis" className={({isActive}) => navClass(isActive)}>
            <span className="nav-icon">📈</span>
            <span className="nav-label">Análisis</span>
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
