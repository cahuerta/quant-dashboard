export default function App() {
  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        background: "black",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        color: "white",
        fontFamily: "monospace"
      }}
    >
      <h1 style={{ fontSize: "60px", margin: 0 }}>
        ☄️ COMETA ACTIVADO ☄️
      </h1>

      <div
        style={{
          width: "200px",
          height: "6px",
          background: "linear-gradient(90deg, #38bdf8, #ef4444)",
          marginTop: "20px",
          animation: "slide 2s infinite"
        }}
      />

      <style>
        {`
          @keyframes slide {
            0% { transform: translateX(-100px); }
            50% { transform: translateX(100px); }
            100% { transform: translateX(-100px); }
          }
        `}
      </style>
    </div>
  );
}
