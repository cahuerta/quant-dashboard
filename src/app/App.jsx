import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./Layout";

// Pages
import Global from "../pages/Global";
import Overview from "../pages/Overview";

export default function App() {
  return (
    <Layout>
      <Routes>

        {/* GLOBAL SYSTEM OVERVIEW (Landing institucional) */}
        <Route path="/" element={<Global />} />

        {/* DASHBOARD CUANTITATIVO */}
        <Route path="/dashboard" element={<Overview />} />

        {/* FUTURAS RUTAS (Escalable SaaS) */}
        {/* <Route path="/portfolio" element={<Portfolio />} /> */}
        {/* <Route path="/signals" element={<Signals />} /> */}
        {/* <Route path="/analysis" element={<Analysis />} /> */}

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />

      </Routes>
    </Layout>
  );
}
