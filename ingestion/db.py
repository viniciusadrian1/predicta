"""Supabase upserts (idempotent). Uses the service role key — run OFFLINE only,
never ship this key to the client."""
from __future__ import annotations
from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY


def client() -> Client:
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ausentes no .env.")
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def document_hash_exists(sb: Client, sha256: str) -> str | None:
    """Return the document id if a doc with this hash already exists, else None."""
    res = sb.table("documents").select("id").eq("sha256", sha256).limit(1).execute()
    return res.data[0]["id"] if res.data else None


def upsert_document(sb: Client, doc: dict, pages: int) -> str:
    row = {
        "file_name": doc["file_name"],
        "title": doc["title"],
        "sha256": doc["sha256"],
        "pages": pages,
        "source_meta": {"equipment_line": doc.get("equipment_line", "geral")},
    }
    res = sb.table("documents").upsert(row, on_conflict="sha256").execute()
    return res.data[0]["id"]


def upsert_chunks(sb: Client, document_id: str, chunks: list[dict], embeddings: list[list[float]]):
    """Idempotent on chunk_sha256. tsv is a generated column (not sent)."""
    rows = []
    for ch, emb in zip(chunks, embeddings):
        rows.append({
            "document_id": document_id,
            "content": ch["content"],
            "content_md": ch.get("content_md"),
            "embedding": emb,
            "metadata": ch["metadata"],
            "chunk_sha256": ch["chunk_sha256"],
        })
    # Batch to keep request sizes sane.
    for i in range(0, len(rows), 100):
        sb.table("chunks").upsert(rows[i:i + 100], on_conflict="chunk_sha256").execute()
