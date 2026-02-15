# =========================================================
# screener.py — ENTERPRISE SCREENER MODULE (PRODUCCIÓN)
# =========================================================
# 🔹 Lee SOLO /data/screener_candidates.json
# 🔹 No depende de dashboard
# 🔹 No usa rate limit
# 🔹 Diseñado para frontend React / SaaS
# 🔹 No monta FastAPI (solo router)
# =========================================================

import os
import json
from pathlib import Path
from typing import Dict, Any, List
from datetime import datetime

from fastapi import APIRouter, HTTPException

# =========================================================
# CONFIG
# =========================================================
DATA_PATH = os.getenv("DATA_PATH", "/data")
SCREENER_FILE = Path(DATA_PATH) / "screener_candidates.json"

# =========================================================
# ROUTER
# =========================================================
router = APIRouter(prefix="/screener", tags=["screener"])

# =========================================================
# HELPERS
# =========================================================
def load_json(path: Path) -> Dict[str, Any]:
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


# =========================================================
# STATUS
# =========================================================
@router.get("/status")
async def screener_status():
    return {
        "status": "ok",
        "file_exists": SCREENER_FILE.exists(),
        "path": str(SCREENER_FILE),
        "timestamp": datetime.utcnow().isoformat(),
    }


# =========================================================
# GET CANDIDATES
# =========================================================
@router.get("/")
async def get_screener():
    if not SCREENER_FILE.exists():
        raise HTTPException(404, "Screener file not available")

    data = load_json(SCREENER_FILE)

    if not data:
        raise HTTPException(500, "Invalid screener file")

    candidates: List[Dict[str, Any]] = data.get("candidates", [])
    meta: Dict[str, Any] = {
        "generated_at": data.get("generated_at"),
        "version": data.get("version"),
        "n_universe": data.get("n_universe"),
        "n_candidates": len(candidates),
    }

    return {
        "meta": meta,
        "candidates": candidates
    }


# =========================================================
# TOP N FILTER (OPCIONAL)
# =========================================================
@router.get("/top")
async def get_top(n: int = 10):
    if not SCREENER_FILE.exists():
        raise HTTPException(404, "Screener file not available")

    data = load_json(SCREENER_FILE)
    candidates = data.get("candidates", [])

    if not isinstance(candidates, list):
        raise HTTPException(500, "Invalid screener format")

    top = sorted(
        candidates,
        key=lambda x: x.get("score", 0),
        reverse=True
    )[:n]

    return {
        "generated_at": data.get("generated_at"),
        "requested_top": n,
        "returned": len(top),
        "candidates": top
    }
