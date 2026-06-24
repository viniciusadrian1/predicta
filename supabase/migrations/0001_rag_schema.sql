-- ─────────────────────────────────────────────────────────────────────────────
-- Predicta · RAG knowledge base — schema (pgvector)
-- Idempotent: safe to re-run. Creates documents + chunks, indexes and RLS.
-- Embedding dimension is 1536 (text-embedding-3-large @ dimensions=1536) — kept
-- under pgvector's ~2000-dim ivf/hnsw limit. If you switch to 3072, migrate the
-- column to halfvec(3072) + hnsw (pgvector >= 0.7).
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists vector;
create extension if not exists pgcrypto;   -- gen_random_uuid()

-- ── Documents ────────────────────────────────────────────────────────────────
create table if not exists public.documents (
  id          uuid primary key default gen_random_uuid(),
  file_name   text not null,
  title       text,
  sha256      text not null unique,          -- idempotency: skip unchanged files
  pages       int,
  source_meta jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- ── Chunks ───────────────────────────────────────────────────────────────────
create table if not exists public.chunks (
  id           uuid primary key default gen_random_uuid(),
  document_id  uuid not null references public.documents(id) on delete cascade,
  content      text not null,                -- plain text (for FTS + prompt)
  content_md   text,                         -- markdown (tables preserved)
  embedding    vector(1536),
  -- Portuguese full-text vector, generated from content (no trigger needed).
  tsv          tsvector generated always as (to_tsvector('portuguese', coalesce(content, ''))) stored,
  metadata     jsonb not null default '{}'::jsonb,
  chunk_sha256 text not null unique,         -- idempotency: upsert by content hash
  created_at   timestamptz not null default now()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────
-- Vector ANN (cosine). HNSW = better recall/latency; needs pgvector >= 0.5.
create index if not exists chunks_embedding_hnsw
  on public.chunks using hnsw (embedding vector_cosine_ops);

-- Full-text search.
create index if not exists chunks_tsv_gin
  on public.chunks using gin (tsv);

-- Metadata filter helpers (equipment_line / topic / content_type).
create index if not exists chunks_meta_equipment on public.chunks ((metadata->>'equipment_line'));
create index if not exists chunks_meta_topic      on public.chunks ((metadata->>'topic'));
create index if not exists chunks_meta_ctype      on public.chunks ((metadata->>'content_type'));
create index if not exists chunks_doc_fk           on public.chunks (document_id);

-- ── Row-Level Security ───────────────────────────────────────────────────────
-- The knowledge tables are written/read by the service role only (the Edge
-- Function uses the service key and bypasses RLS). We enable RLS and add NO
-- public policies, so anon/authenticated clients cannot read the raw corpus
-- directly — all access goes through the `assistant-rag` function, which enforces
-- the app's RBAC. (To allow signed-in users to read, add a SELECT policy.)
alter table public.documents enable row level security;
alter table public.chunks    enable row level security;

-- Optional: uncomment to let authenticated users read the corpus directly.
-- create policy "read corpus" on public.chunks for select to authenticated using (true);
-- create policy "read docs"   on public.documents for select to authenticated using (true);
