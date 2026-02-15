export default function Layout({ children }) {
  return (
    <div className="layout">
      <header className="header">
        <div className="brand">Quant Enterprise</div>
        <div className="header-info">
          <span>Market Mode: —</span>
          <span>Risk: —</span>
        </div>
      </header>

      <main className="main">{children}</main>
    </div>
  );
}
