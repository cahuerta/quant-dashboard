// js/api.js

const API = "https://spy-2w-price-prediction.onrender.com";

export async function apiGet(url) {
  const r = await fetch(API + url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return await r.json();
}
