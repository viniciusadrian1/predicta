"""Discover PDFs in sources/ and hash them (idempotency by sha256)."""
from __future__ import annotations
import hashlib
import os
from config import SOURCES_DIR, profile_for


def sha256_of(path: str, buf: int = 1 << 20) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(buf):
            h.update(chunk)
    return h.hexdigest()


def discover() -> list[dict]:
    """Return [{path, file_name, sha256, title, equipment_line}] for every PDF."""
    if not os.path.isdir(SOURCES_DIR):
        os.makedirs(SOURCES_DIR, exist_ok=True)
        return []
    out: list[dict] = []
    for name in sorted(os.listdir(SOURCES_DIR)):
        if not name.lower().endswith(".pdf"):
            continue
        path = os.path.join(SOURCES_DIR, name)
        prof = profile_for(name)
        out.append({
            "path": path,
            "file_name": name,
            "sha256": sha256_of(path),
            "title": prof.get("title") or name,
            "equipment_line": prof.get("equipment_line", "geral"),
        })
    return out
