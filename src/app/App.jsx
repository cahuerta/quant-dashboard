import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./Layout";

import Global from "../pages/Global";
import Universe from "../pages/Universe";
import Signals from "../pages/Signals";
import Screener from "../pages/Screener";
import Portfolio from "../pages/Portfolio";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Global />} />
        <Route path="/universe" element={<Universe />} />
        <Route path="/universe-cl" element={<Universe />} />
        <Route path="/signals" element={<Signals />} />
        <Route path="/screener" element={<Screener />} />
        <Route path="/portfolio" element={<Portfolio />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Route>
    </Routes>
  );
}
