# Predicta · RAG — Ingestão & Setup

RAG sobre **documentação técnica de OEM** (manuais WEG) para o Assistente de IA do Predicta.
Pipeline: **PDFs → parser (tabelas como cidadãs de 1ª classe) → chunks estruturais → embeddings
→ pgvector (Supabase)**; consulta: **recuperação híbrida (vetorial + full-text PT) + RRF + rerank
→ geração com citação obrigatória e sinalização de confiança**.

> **Decisão de stack (reconciliação):** o app é uma SPA Vite. Este RAG é um **subsistema Supabase**
> à parte (escolha explícita do dono do projeto), seguindo o spec literal: Postgres + pgvector +
> Edge Function + ingestão Python + Cohere rerank. Ele **não substitui** o assistente operacional
> existente (`/api/assistant`, tool-use sobre o store) — **estende** o Assistente com um modo
> **"Base técnica (manuais)"** (toggle no topo da tela). Os dois convivem.

---

## ⚡ Opção A — RAG LOCAL (sem Supabase) — já está rodando

Caminho **repo-native** que funciona só com `OPENAI_API_KEY` (sem Supabase/Cohere). Foi o usado para
**alimentar a RAG nesta máquina**: gera uma base vetorial estática e serve via o proxy Vite (`/api/rag`).

```bash
cd ingestion
pip install pdfplumber openai tiktoken python-dotenv tqdm   # (sem pymupdf/supabase)
# coloque os PDFs em ingestion/sources/  (já estão)
python build_local.py --dry-run     # confere parse/chunks (sem custo)
python build_local.py               # embeda (OpenAI) → server/rag/knowledge.json (~21 MB, 768d)
```

Reinicie o dev server (o proxy é middleware) e ligue o toggle **"Base técnica"** no Assistente. O
`src/ai/rag.ts` usa o `/api/rag` local automaticamente **quando não há `VITE_SUPABASE_*`**, e troca para a
Edge Function Supabase quando elas existirem. Recuperação: cosseno + keyword fundidos por **RRF**,
geração com as mesmas regras (cita-ou-recusa + confiança). Validado: relubrificação 6314 → 12.000 h;
pintura C4 → 222 E/P; ensaio 4160 V → 1000–2500 V; pergunta fora do acervo → "não encontrei".

`knowledge.json` é artefato derivado (gitignored) — regenere com `build_local.py` quando trocar os PDFs.

> **Opção B (abaixo)** = stack completo Supabase/pgvector/Edge/Cohere para produção/escala.

---

## Pré-requisitos

- Conta **Supabase** (projeto criado) + **Supabase CLI** (`npm i -g supabase`).
- **Python 3.10+** (para a ingestão offline).
- **OpenAI API key** (embeddings + geração). **Cohere API key** (rerank) — opcional.

## 1. Configurar variáveis

Copie `/.env.example` para `/.env` na **raiz** do repo e preencha:

```
# Cliente (expostos ao navegador — só URL + anon key):
VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
# Servidor/ingestão (NUNCA versionar):
SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY, COHERE_API_KEY (opcional)
EMBEDDING_MODEL=text-embedding-3-large, EMBEDDING_DIMENSIONS=1536, RERANK_MODEL, GEN_MODEL, TOP_K
```

> ⚠️ **Segurança:** o `SUPABASE_SERVICE_ROLE_KEY` e as chaves OpenAI/Cohere **nunca** vão para o
> bundle do cliente — só `VITE_*` chega ao navegador. O service role é usado apenas pela ingestão
> (offline) e pela Edge Function (secrets do servidor).

## 2. Migrations (pgvector + schema + busca híbrida)

```bash
supabase link --project-ref SEU_REF
supabase db push          # aplica supabase/migrations/0001_* e 0002_*
```

Cria: extensão `vector`, tabelas `documents`/`chunks`, índices **HNSW** (cosine) + **GIN** (tsv PT),
RLS (corpus acessível só pelo serviço) e a função SQL `match_hybrid` (dense + sparse + **RRF**).

## 3. Colocar os PDFs e ingerir

```bash
# coloque os manuais em ingestion/sources/  (ex.: WEG-MOTOR-W22-MANUAL.pdf, ...TN04..., etc.)
cd ingestion
python -m venv .venv && source .venv/bin/activate    # (Windows: .venv\Scripts\activate)
pip install -r requirements.txt

python pipeline.py --dry-run    # parse + chunk + relatório, sem gravar (confere extração de tabelas)
python pipeline.py              # ingere o que for novo (idempotente por sha256)
```

A ingestão é **idempotente**: documentos com hash inalterado são pulados; chunks são upsertados por
`chunk_sha256`. Re-rode sempre que adicionar PDFs novos em `sources/`.

**Características tratadas:** cada **tabela vira um chunk único** com cabeçalho contextual
(`Tabela X — seção — linha do equipamento`) e **nunca é quebrada**; texto é janelado por seção
(~700 tokens, overlap ~120); metadados por chunk: `source_file, doc_title, section, page,
content_type (text|table|figure_caption), lang, equipment_line, topic, chunk_sha256`.

## 4. Deploy da Edge Function

```bash
supabase secrets set OPENAI_API_KEY=sk-... COHERE_API_KEY=... EMBEDDING_MODEL=text-embedding-3-large EMBEDDING_DIMENSIONS=1536 RERANK_MODEL=rerank-multilingual-v3.0 GEN_MODEL=gpt-4o TOP_K=7
supabase functions deploy assistant-rag
```

Endpoint: `POST {VITE_SUPABASE_URL}/functions/v1/assistant-rag`
Entrada `{ query, filters?, role? }` → saída `{ answer, citations[], confidence, retrieved[] }`.

## 5. Frontend

Já integrado: tela **Assistente de IA** → toggle **"Base técnica"** (ícone de livro) liga o modo RAG.
As respostas mostram **citações clicáveis** (documento + seção/página, com o trecho-fonte), um
**badge de confiança** (alta/média/baixa) nos tokens de `src/lib/theme.ts`, e o estado **"sem fonte"**
quando o RAG não encontra nada. Basta ter `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` no `.env`.

## 6. Avaliação (golden set)

```bash
# recuperação apenas (embed + match_hybrid, sem LLM):
python eval/run.py --retrieval-only

# ponta a ponta (bate na Edge Function):
export ASSISTANT_RAG_URL="$VITE_SUPABASE_URL/functions/v1/assistant-rag"
export SUPABASE_ANON_KEY="$VITE_SUPABASE_ANON_KEY"
python eval/run.py
```

`eval/golden.json` cobre os casos do spec (relubrificação 6314 → 12000 h; tensão de ensaio 4160 V →
1000–2500 V; pintura C4 → 222 E/P; carga×corrente não-linear; vibração IEC160 grau A → 2.2 mm/s;
correção 50 °C/2000 m → 0,87) **e** casos **fora do corpus** que devem retornar *"não encontrei nas
fontes"* — validando a honestidade do sistema. O runner verifica fonte correta + valor exato + presença
de citação, e falha (exit ≠ 0) se algum caso quebrar.

---

## Estrutura

```
ingestion/
  pipeline.py            # CLI idempotente (orquestra tudo)
  discover.py parse.py chunk.py embed.py db.py report.py config.py
  sources/               # << coloque os PDFs aqui
  eval/golden.json eval/run.py eval/_retrieval_check.py
supabase/
  migrations/0001_rag_schema.sql 0002_match_hybrid.sql
  functions/assistant-rag/index.ts
src/ai/rag.ts            # cliente do endpoint (anon key)
src/pages/Assistente.tsx # toggle "Base técnica" + citações + confiança + "sem fonte"
```

## Notas de tuning

- **Tabelas**: a extração usa `pdfplumber`; se alguma tabela vier ruim, ajuste `parse.py`
  (`extract_tables`/heurística de caption) — o `--dry-run` ajuda a inspecionar.
- **3072 dims**: o schema usa `vector(1536)` (limite de índice do pgvector). Para 3072, migre a
  coluna para `halfvec(3072)` + HNSW (pgvector ≥ 0.7) e ajuste `EMBEDDING_DIMENSIONS`.
- **RBAC**: a função aceita `role` e tem um gate (lenient hoje). Em produção, verifique um JWT do
  Supabase Auth em vez de confiar no papel enviado pelo cliente.
