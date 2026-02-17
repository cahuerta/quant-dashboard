export default async function handler(req, res) {
  const BASE = process.env.BACKEND_URL;
  const KEY = process.env.PIPELINE_KEY;

  try {
    const response = await fetch(`${BASE}/internal/positions`, {
      headers: {
        "X-PIPELINE-KEY": KEY,
      },
    });

    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: "Proxy error" });
  }
}
