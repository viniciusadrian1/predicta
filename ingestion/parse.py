"""PDF parsing: text (with section tracking) + tables (as Markdown) + figure
captions, keeping page numbers. Tables are first-class — pdfplumber extracts them,
pymupdf gives fast text/positions and heading detection.

Output: a list of "blocks", each:
  { "type": "text"|"table"|"figure_caption", "text": str, "content_md": str,
    "page": int, "section": str, "caption": str|None }
"""
from __future__ import annotations
import re
import fitz                      # PyMuPDF
import pdfplumber

HEADING_RE = re.compile(r"^\s*(\d+(?:\.\d+)*)\s+\S")          # "8.1 Lubrificação"
TABLE_CAP_RE = re.compile(r"(Tabela|Tab\.)\s+([\d.]+)\s*[-–—:]?\s*(.*)", re.IGNORECASE)
FIG_CAP_RE = re.compile(r"(Figura|Fig\.)\s+([\d.]+)\s*[-–—:]?\s*(.*)", re.IGNORECASE)


def _table_to_md(rows: list[list]) -> str:
    rows = [[("" if c is None else str(c)).replace("\n", " ").strip() for c in r] for r in rows if r]
    if not rows:
        return ""
    width = max(len(r) for r in rows)
    rows = [r + [""] * (width - len(r)) for r in rows]
    header = rows[0]
    body = rows[1:] if len(rows) > 1 else []
    md = ["| " + " | ".join(header) + " |", "| " + " | ".join(["---"] * width) + " |"]
    for r in body:
        md.append("| " + " | ".join(r) + " |")
    return "\n".join(md)


def _is_heading(line: str, size: float, body_size: float) -> bool:
    s = line.strip()
    if not s or len(s) > 90:
        return False
    if HEADING_RE.match(s):
        return True
    # Large font OR short ALL-CAPS line → treat as a section heading.
    if size >= body_size * 1.18 and len(s) <= 70:
        return True
    if s.isupper() and 3 <= len(s) <= 60 and not any(ch.isdigit() for ch in s[:2]):
        return True
    return False


def parse_pdf(path: str) -> dict:
    doc = fitz.open(path)
    # Estimate body font size (median span size) for heading detection.
    sizes: list[float] = []
    for page in doc:
        for blk in page.get_text("dict").get("blocks", []):
            for ln in blk.get("lines", []):
                for sp in ln.get("spans", []):
                    if sp.get("text", "").strip():
                        sizes.append(sp["size"])
    sizes.sort()
    body_size = sizes[len(sizes) // 2] if sizes else 10.0

    # Per-page table captions (from pdfplumber text), to title each table chunk.
    blocks: list[dict] = []
    section = "Início"

    with pdfplumber.open(path) as pl:
        for pidx, page in enumerate(doc):
            page_no = pidx + 1
            pl_page = pl.pages[pidx] if pidx < len(pl.pages) else None

            # 1) Tables (pdfplumber) → one block each, with nearest "Tabela X.Y" caption.
            page_text_lines = (pl_page.extract_text() or "").splitlines() if pl_page else []
            table_caps = [m.group(0).strip() for ln in page_text_lines for m in [TABLE_CAP_RE.match(ln.strip())] if m]
            tables = pl_page.extract_tables() if pl_page else []
            for ti, t in enumerate(tables):
                md = _table_to_md(t)
                if not md or md.count("|") < 6:        # skip trivial/garbage tables
                    continue
                cap = table_caps[ti] if ti < len(table_caps) else (table_caps[0] if table_caps else None)
                flat = " ; ".join(" ".join((c or "").split()) for row in t for c in row if c)
                blocks.append({
                    "type": "table", "page": page_no, "section": section,
                    "caption": cap, "content_md": md, "text": flat,
                })

            # 2) Text + section tracking (pymupdf), + figure captions.
            for blk in page.get_text("dict").get("blocks", []):
                for ln in blk.get("lines", []):
                    spans = ln.get("spans", [])
                    text = "".join(sp.get("text", "") for sp in spans).strip()
                    if not text:
                        continue
                    max_size = max((sp.get("size", body_size) for sp in spans), default=body_size)
                    if _is_heading(text, max_size, body_size):
                        section = text
                        continue
                    fig = FIG_CAP_RE.match(text)
                    if fig:
                        blocks.append({"type": "figure_caption", "page": page_no, "section": section,
                                       "caption": text, "content_md": text, "text": text})
                        continue
                    blocks.append({"type": "text", "page": page_no, "section": section,
                                   "caption": None, "content_md": text, "text": text})

    pages = doc.page_count
    doc.close()
    return {"pages": pages, "blocks": blocks}
