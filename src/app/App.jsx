import { Routes, Route } from "react-router-dom";
import Layout from "./Layout";
import Overview from "../pages/Overview";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Overview />} />
      </Routes>
    </Layout>
  );
}
