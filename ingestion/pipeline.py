#!/usr/bin/env python3
"""Predicta · RAG ingestion pipeline (idempotent).

    python pipeline.py            # ingest everything new in sources/
    python pipeline.py --force    # re-ingest even if the file hash is unchanged
    python pipeline.py --dry-run  # parse + chunk + report, no embeddings/DB writes

Re-runnable safely: documents are keyed by sha256, chunks by chunk_sha256.
"""
from __future__ import annotations
import argparse
import sys
import tiktoken
from tqdm import tqdm

from discover import discover
from parse import parse_pdf
from chunk import build_chunks
from report import render_report

_ENC = tiktoken.get_encoding("cl100k_base")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true", help="re-ingest unchanged files")
    ap.add_argument("--dry-run", action="store_true", help="no embeddings / no DB writes")
    args = ap.parse_args()

    docs = discover()
    stats = {"docs_found": len(docs), "docs_ingested": 0, "docs_skipped": 0,
             "chunks": 0, "tables": 0, "text": 0, "figures": 0, "tokens": 0, "per_doc": []}

    if not docs:
        print("Nenhum PDF em ingestion/sources/. Coloque os manuais lá e rode de novo.")
        return 0

    sb = None
    if not args.dry_run:
        from db import client, document_hash_exists, upsert_document, upsert_chunks
        from embed import embed_texts
        sb = client()

    for doc in docs:
        per = {"file_name": doc["file_name"], "skipped": False, "chunks": 0, "tables": 0}

        if sb and not args.force and document_hash_exists(sb, doc["sha256"]):
            per["skipped"] = True
            stats["docs_skipped"] += 1
            stats["per_doc"].append(per)
            continue

        parsed = parse_pdf(doc["path"])
        chunks = build_chunks(parsed, doc)
        if not chunks:
            stats["per_doc"].append(per)
            continue

        per["chunks"] = len(chunks)
        per["tables"] = sum(1 for c in chunks if c["metadata"]["content_type"] == "table")
        stats["chunks"] += len(chunks)
        stats["tables"] += per["tables"]
        stats["text"] += sum(1 for c in chunks if c["metadata"]["content_type"] == "text")
        stats["figures"] += sum(1 for c in chunks if c["metadata"]["content_type"] == "figure_caption")
        stats["tokens"] += sum(len(_ENC.encode(c["content"])) for c in chunks)

        if not args.dry_run:
            doc_id = upsert_document(sb, doc, parsed["pages"])
            embeddings = embed_texts([c["content"] for c in tqdm(chunks, desc=f"emb {doc['file_name'][:24]}")])
            upsert_chunks(sb, doc_id, chunks, embeddings)

        stats["docs_ingested"] += 1
        stats["per_doc"].append(per)

    print(render_report(stats))
    if args.dry_run:
        print("\n(dry-run: nada foi embedado nem gravado)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
