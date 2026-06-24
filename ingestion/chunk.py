"""Structural chunking.

- Each TABLE is a single chunk, prefixed with a contextual header (caption +
  section + equipment line) so it is retrievable by meaning. Tables are NEVER split.
- TEXT blocks are grouped by section and windowed to ~CHUNK_TARGET_TOKENS with
  ~CHUNK_OVERLAP_TOKENS overlap (token-aware via tiktoken).
- Figure captions become their own small chunks (content_type=figure_caption).

Each chunk: { content, content_md, metadata{...}, chunk_sha256 }.
"""
from __future__ import annotations
import hashlib
import re
import tiktoken
from config import CHUNK_TARGET_TOKENS, CHUNK_OVERLAP_TOKENS, infer_topic

_ENC = tiktoken.get_encoding("cl100k_base")


def _toks(s: str) -> list[int]:
    return _ENC.encode(s)


def _detok(t: list[int]) -> str:
    return _ENC.decode(t)


def _sha(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


def _detect_lang(s: str) -> str:
    # Cheap PT vs EN heuristic; corpus is PT with EN excerpts.
    en = sum(s.lower().count(w) for w in (" the ", " and ", " of ", " for ", " with "))
    pt = sum(s.lower().count(w) for w in (" de ", " da ", " do ", " para ", " com ", "ção", "ões"))
    return "en" if en > pt else "pt"


def build_chunks(parsed: dict, doc: dict) -> list[dict]:
    """doc = {file_name, title, equipment_line}. parsed = output of parse_pdf."""
    chunks: list[dict] = []
    base_meta = {
        "source_file": doc["file_name"],
        "doc_title": doc["title"],
        "equipment_line": doc.get("equipment_line", "geral"),
    }

    def add(content: str, content_md: str, page: int, section: str, content_type: str):
        content = content.strip()
        if len(content) < 15:
            return
        meta = {
            **base_meta,
            "section": section or "",
            "page": page,
            "content_type": content_type,
            "lang": _detect_lang(content),
            "topic": infer_topic((section or "") + " " + content),
        }
        chunks.append({
            "content": content,
            "content_md": content_md,
            "metadata": meta,
            "chunk_sha256": _sha(f"{doc['file_name']}|{page}|{section}|{content}"),
        })

    # 1) Tables + figure captions → standalone chunks (with contextual header).
    text_blocks: list[dict] = []
    for b in parsed["blocks"]:
        if b["type"] == "table":
            header = " — ".join(x for x in [b.get("caption"), b.get("section"), base_meta["equipment_line"]] if x)
            header = (header or "Tabela").strip()
            md = f"**{header}**\n\n{b['content_md']}"
            txt = f"{header}\n{b['text']}"
            add(txt, md, b["page"], b.get("section", ""), "table")
        elif b["type"] == "figure_caption":
            add(b["text"], b["content_md"], b["page"], b.get("section", ""), "figure_caption")
        else:
            text_blocks.append(b)

    # 2) Text blocks grouped by (section) → windowed by tokens.
    by_section: dict[str, list[dict]] = {}
    order: list[str] = []
    for b in text_blocks:
        key = b.get("section", "") or "Geral"
        if key not in by_section:
            by_section[key] = []
            order.append(key)
        by_section[key].append(b)

    step = max(1, CHUNK_TARGET_TOKENS - CHUNK_OVERLAP_TOKENS)
    for section in order:
        blocks = by_section[section]
        page0 = blocks[0]["page"]
        joined = re.sub(r"[ \t]+", " ", " ".join(b["text"] for b in blocks)).strip()
        toks = _toks(joined)
        if not toks:
            continue
        i = 0
        while i < len(toks):
            window = toks[i:i + CHUNK_TARGET_TOKENS]
            text = _detok(window)
            add(text, text, page0, section, "text")
            i += step

    return chunks
