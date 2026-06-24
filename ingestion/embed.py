"""OpenAI embeddings (batched), with the dimension fixed by env (default 1536)."""
from __future__ import annotations
from openai import OpenAI
from config import OPENAI_API_KEY, EMBEDDING_MODEL, EMBEDDING_DIMENSIONS, EMBED_BATCH

_client: OpenAI | None = None


def _client_lazy() -> OpenAI:
    global _client
    if _client is None:
        if not OPENAI_API_KEY:
            raise RuntimeError("OPENAI_API_KEY ausente — configure no .env da raiz.")
        _client = OpenAI(api_key=OPENAI_API_KEY)
    return _client


def embed_texts(texts: list[str]) -> list[list[float]]:
    """Return one 1536-d (EMBEDDING_DIMENSIONS) vector per input text, batched."""
    client = _client_lazy()
    out: list[list[float]] = []
    for i in range(0, len(texts), EMBED_BATCH):
        batch = [t.replace("\n", " ")[:8000] for t in texts[i:i + EMBED_BATCH]]
        resp = client.embeddings.create(
            model=EMBEDDING_MODEL,
            input=batch,
            dimensions=EMBEDDING_DIMENSIONS,
        )
        out.extend(d.embedding for d in resp.data)
    return out
