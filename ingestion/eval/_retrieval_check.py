"""Retrieval-only helper for `eval/run.py --retrieval-only`: embed the query and
call the match_hybrid RPC directly (no LLM involved)."""
from __future__ import annotations
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), os.pardir))

from embed import embed_texts  # noqa: E402
from db import client          # noqa: E402


def retrieve(query: str, k: int = 8) -> list[dict]:
    emb = embed_texts([query])[0]
    sb = client()
    res = sb.rpc("match_hybrid", {
        "query_embedding": emb,
        "query_text": query,
        "match_count": k,
    }).execute()
    return res.data or []
