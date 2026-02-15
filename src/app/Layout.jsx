import { NavLink, Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div style={{ minHeight: "100vh", background: "#0b1220", color: "white" }}>

      {/* NAV BAR */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 1000,
          display: "flex",
          gap: "24px",
          padding: "18px 40px",
          background: "#111827",
          borderBottom: "1px solid rgba(255,255,255,0.08)"
        }}
      >

        <NavLink to="/" style={linkStyle}>Resumen</NavLink>
        <NavLink to="/universe" style={linkStyle}>Universo</NavLink>
        <NavLink to="/universe-cl" style={linkStyle}>Universo Chile</NavLink>
        <NavLink to="/signals" style={linkStyle}>Signals</NavLink>
        <NavLink to="/screener" style={linkStyle}>Screener</NavLink>
        <NavLink to="/portfolio" style={linkStyle}>Portafolio</NavLink>

      </header>

      {/* CONTENT */}
      <main style={{ padding: "40px" }}>
        <Outlet />
      </main>

    </div>
  );
}

const linkStyle = ({ isActive }) => ({
  color: isActive ? "#38bdf8" : "#cbd5e1",
  textDecoration: "none",
  fontWeight: 500
});
