#!/usr/bin/env python3
"""Build a LOCAL static knowledge base (no Supabase) so the RAG works in dev with
just OPENAI_API_KEY. Parses sources/ with pdfplumber (tables → markdown), reuses the
structural chunker, embeds with OpenAI, and writes server/rag/knowledge.json.

    python build_local.py            # full build
    python build_local.py --dry-run  # parse + chunk + report, no embeddings/file

The Vite proxy endpoint /api/rag reads knowledge.json and does cosine + keyword (RRF)
retrieval + grounded generation. This is the repo-native fallback to the Supabase path.
"""
from __future__ import annotations
import argparse
import base64
import json
import os
import re
import sys
from array import array

import logging
import pdfplumber
from tqdm import tqdm

from discover import discover
from chunk import build_chunks
from config import OPENAI_API_KEY

# Windows console is cp1252 by default — force UTF-8 so prints (→, •, ✓) don't crash.
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass
# Silence pdfminer's noisy color/shape warnings.
for _n in ("pdfminer", "pdfplumber", "pdfminer.pdfinterp", "pdfminer.converter"):
    logging.getLogger(_n).setLevel(logging.ERROR)

LOCAL_DIM = int(os.getenv("LOCAL_EMBEDDING_DIMENSIONS", "768"))
EMBED_MODEL = os.getenv("EMBEDDING_MODEL", "text-embedding-3-large")
OUT_PATH = os.path.join(os.path.dirname(__file__), os.pardir, "server", "rag", "knowledge.json")

HEADING_RE = re.compile(r"^\s*(\d+(?:\.\d+)*)\s+\S")
TABLE_CAP_RE = re.compile(r"(Tabela|Tab\.)\s+([\d.]+)\s*[-–—:]?\s*(.*)", re.IGNORECASE)
FIG_CAP_RE = re.compile(r"(Figura|Fig\.)\s+([\d.]+)", re.IGNORECASE)


def _table_to_md(rows: list[list]) -> str:
    rows = [[("" if c is None else str(c)).replace("\n", " ").strip() for c in r] for r in rows if r]
    if not rows:
        return ""
    width = max(len(r) for r in rows)
    rows = [r + [""] * (width - len(r)) for r in rows]
    md = ["| " + " | ".join(rows[0]) + " |", "| " + " | ".join(["---"] * width) + " |"]
    for r in rows[1:]:
        md.append("| " + " | ".join(r) + " |")
    return "\n".join(md)


def _is_heading(line: str) -> bool:
    s = line.strip()
    if not s or len(s) > 90:
        return False
    if HEADING_RE.match(s):
        return True
    return s.isupper() and 3 <= len(s) <= 60 and not s[:2].isdigit()


def parse_pdf_pdfplumber(path: str) -> dict:
    """pdfplumber-only parse → same block shape the chunker expects."""
    blocks: list[dict] = []
    section = "Início"
    with pdfplumber.open(path) as pl:
        pages = len(pl.pages)
        for pidx, page in enumerate(pl.pages):
            page_no = pidx + 1
            text = page.extract_text() or ""
            lines = text.splitlines()
            caps = [m.group(0).strip() for ln in lines for m in [TABLE_CAP_RE.match(ln.strip())] if m]

            for ti, t in enumerate(page.extract_tables() or []):
                md = _table_to_md(t)
                if not md or md.count("|") < 6:
                    continue
                cap = caps[ti] if ti < len(caps) else (caps[0] if caps else None)
                flat = " ; ".join(" ".join((c or "").split()) for row in t for c in row if c)
                blocks.append({"type": "table", "page": page_no, "section": section,
                               "caption": cap, "content_md": md, "text": flat})

            for ln in lines:
                s = ln.strip()
                if not s:
                    continue
                if _is_heading(s):
                    section = s
                    continue
                btype = "figure_caption" if FIG_CAP_RE.match(s) else "text"
                blocks.append({"type": btype, "page": page_no, "section": section,
                               "caption": s if btype == "figure_caption" else None,
                               "content_md": s, "text": s})
    return {"pages": pages, "blocks": blocks}


def embed_local(texts: list[str]) -> list[list[float]]:
    from openai import OpenAI
    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY ausente no .env da raiz.")
    client = OpenAI(api_key=OPENAI_API_KEY)
    out: list[list[float]] = []
    B = 64
    for i in tqdm(range(0, len(texts), B), desc="embeddings"):
        batch = [t.replace("\n", " ")[:8000] for t in texts[i:i + B]]
        resp = client.embeddings.create(model=EMBED_MODEL, input=batch, dimensions=LOCAL_DIM)
        out.extend(d.embedding for d in resp.data)
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    docs = discover()
    if not docs:
        print("Nenhum PDF em ingestion/sources/.")
        return 1

    all_chunks: list[dict] = []
    for doc in docs:
        parsed = parse_pdf_pdfplumber(doc["path"])
        chunks = build_chunks(parsed, doc)
        ntab = sum(1 for c in chunks if c["metadata"]["content_type"] == "table")
        print(f"  • {doc['file_name'][:46]:46s} {parsed['pages']:3d}p → {len(chunks):4d} chunks ({ntab} tab)")
        all_chunks.extend(chunks)

    print(f"\nTotal: {len(all_chunks)} chunks de {len(docs)} documentos.")
    if args.dry_run:
        print("(dry-run: sem embeddings, sem arquivo)")
        return 0

    embeddings = embed_local([c["content"] for c in all_chunks])
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    def b64(emb: list[float]) -> str:
        return base64.b64encode(array("f", emb).tobytes()).decode("ascii")

    payload = {
        "model": EMBED_MODEL,
        "dimensions": LOCAL_DIM,
        "embedding_format": "base64-float32",
        "count": len(all_chunks),
        "chunks": [
            {"id": c["chunk_sha256"][:16], "content": c["content"],
             "content_md": c.get("content_md"), "metadata": c["metadata"], "emb": b64(emb)}
            for c, emb in zip(all_chunks, embeddings)
        ],
    }
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False)
    size_mb = os.path.getsize(OUT_PATH) / (1024 * 1024)
    print(f"\n✓ Gravado {OUT_PATH} — {len(all_chunks)} chunks, {LOCAL_DIM}d, {size_mb:.1f} MB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
