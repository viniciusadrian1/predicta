-- ─────────────────────────────────────────────────────────────────────────────
-- Predicta · RAG — hybrid search (dense + sparse) fused with Reciprocal Rank
-- Fusion (RRF). Returns the top `match_count` chunks with source metadata so the
-- Edge Function can rerank + cite. Idempotent (create or replace).
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.match_hybrid(
  query_embedding   vector(1536),
  query_text        text,
  match_count       int   default 30,
  rrf_k             int   default 50,        -- RRF damping constant
  semantic_weight   float default 1.0,
  fulltext_weight   float default 1.0,
  filter            jsonb default '{}'::jsonb -- e.g. {"equipment_line":"W22","topic":"lubrificacao"}
)
returns table (
  id            uuid,
  document_id   uuid,
  content       text,
  content_md    text,
  metadata      jsonb,
  semantic_rank int,
  fulltext_rank int,
  rrf_score     float
)
language sql stable
as $$
  with
  -- candidate pool size for each arm (over-fetch, then fuse)
  params as (select greatest(match_count * 2, 40) as pool),
  dense as (
    select c.id,
           row_number() over (order by c.embedding <=> query_embedding) as rank
    from public.chunks c, params
    where c.embedding is not null
      and (filter = '{}'::jsonb or c.metadata @> filter)
    order by c.embedding <=> query_embedding
    limit (select pool from params)
  ),
  sparse as (
    select c.id,
           row_number() over (
             order by ts_rank_cd(c.tsv, websearch_to_tsquery('portuguese', query_text)) desc
           ) as rank
    from public.chunks c, params
    where query_text is not null and length(trim(query_text)) > 0
      and c.tsv @@ websearch_to_tsquery('portuguese', query_text)
      and (filter = '{}'::jsonb or c.metadata @> filter)
    order by ts_rank_cd(c.tsv, websearch_to_tsquery('portuguese', query_text)) desc
    limit (select pool from params)
  ),
  fused as (
    select
      coalesce(d.id, s.id) as id,
      d.rank as semantic_rank,
      s.rank as fulltext_rank,
      coalesce(semantic_weight / (rrf_k + d.rank), 0.0)
        + coalesce(fulltext_weight / (rrf_k + s.rank), 0.0) as rrf_score
    from dense d
    full outer join sparse s on d.id = s.id
  )
  select c.id, c.document_id, c.content, c.content_md, c.metadata,
         f.semantic_rank, f.fulltext_rank, f.rrf_score
  from fused f
  join public.chunks c on c.id = f.id
  order by f.rrf_score desc
  limit match_count;
$$;

-- Allow the function to be called by the service role / authenticated users.
grant execute on function public.match_hybrid(vector, text, int, int, float, float, jsonb) to anon, authenticated, service_role;
