// ─────────────────────────────────────────────────────────────────────────────
// Predicta · assistant-rag (Supabase Edge Function, Deno)
// Hybrid retrieval (match_hybrid: dense + sparse + RRF) → Cohere rerank → grounded
// generation with strict "cite-or-refuse + confidence" rules. Secrets stay server-
// side (service role, OpenAI, Cohere); the client only sends { query, filters?, role? }.
//
// Deploy:  supabase functions deploy assistant-rag
// Secrets: supabase secrets set OPENAI_API_KEY=... COHERE_API_KEY=... (+ EMBEDDING_*)
// ─────────────────────────────────────────────────────────────────────────────
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const COHERE_API_KEY = Deno.env.get("COHERE_API_KEY") ?? "";
const EMBEDDING_MODEL = Deno.env.get("EMBEDDING_MODEL") ?? "text-embedding-3-large";
const EMBEDDING_DIMENSIONS = Number(Deno.env.get("EMBEDDING_DIMENSIONS") ?? "1536");
const RERANK_MODEL = Deno.env.get("RERANK_MODEL") ?? "rerank-multilingual-v3.0";
const GEN_MODEL = Deno.env.get("GEN_MODEL") ?? "gpt-4o";
const TOP_K = Number(Deno.env.get("TOP_K") ?? "7");

// Modules whose role must be able to use the assistant (app RBAC). Lenient: if no
// role is provided we allow (the app already gates the route); when provided we block
// roles the app would block. Real deployments should verify a Supabase JWT instead.
const BLOCKED_ROLES = new Set<string>([]); // e.g. add roles that must not query docs

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
};

const json = (status: number, obj: unknown) =>
  new Response(JSON.stringify(obj), { status, headers: { ...CORS, "content-type": "application/json" } });

const SYSTEM = `Você é o assistente técnico do Predicta (by Forzy), especialista em manutenção de ativos industriais.
Responda EXCLUSIVAMENTE com base nos TRECHOS fornecidos abaixo.
Regras inegociáveis:
- Cite a fonte (documento + seção/página) em cada afirmação técnica, no formato [n] referenciando os TRECHOS.
- Use os VALORES e UNIDADES exatos das tabelas; NUNCA aproxime ou arredonde (torques, intervalos, tensões, fatores).
- Se a resposta não estiver nos trechos, diga claramente "Não encontrei isso nos documentos disponíveis." e NÃO invente. Isto é uma exigência de SEGURANÇA: valores errados de lubrificação, torque ou tensão de ensaio podem causar dano a pessoas e equipamentos.
- Tom técnico, conciso, em português do Brasil.
Termine SEMPRE com uma linha exatamente no formato: "Confiança: alta" | "Confiança: média" | "Confiança: baixa", coerente com a cobertura dos trechos (baixa cobertura → baixa confiança).`;

async function embed(query: string): Promise<number[]> {
  const r = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: query.replace(/\n/g, " "), dimensions: EMBEDDING_DIMENSIONS }),
  });
  if (!r.ok) throw new Error(`embeddings ${r.status}: ${await r.text()}`);
  return (await r.json()).data[0].embedding;
}

async function rerank(query: string, docs: string[]): Promise<{ index: number; score: number }[] | null> {
  if (!COHERE_API_KEY) return null;
  const r = await fetch("https://api.cohere.com/v2/rerank", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${COHERE_API_KEY}` },
    body: JSON.stringify({ model: RERANK_MODEL, query, documents: docs, top_n: Math.min(TOP_K, docs.length) }),
  });
  if (!r.ok) return null; // graceful: fall back to RRF order
  const data = await r.json();
  return (data.results ?? []).map((x: { index: number; relevance_score: number }) => ({ index: x.index, score: x.relevance_score }));
}

async function generate(query: string, context: string): Promise<string> {
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: GEN_MODEL,
      temperature: 0,
      max_tokens: 900,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: `TRECHOS:\n${context}\n\nPERGUNTA: ${query}` },
      ],
    }),
  });
  if (!r.ok) throw new Error(`chat ${r.status}: ${await r.text()}`);
  return (await r.json()).choices?.[0]?.message?.content ?? "";
}

function confidenceFrom(answer: string, topScore: number, hasRerank: boolean): "alta" | "media" | "baixa" {
  const m = answer.match(/Confian[çc]a:\s*(alta|m[ée]dia|baixa)/i);
  const declared = m ? m[1].toLowerCase().replace("é", "e").replace("media", "media") : "";
  if (/não encontrei|nao encontrei|não consta|sem fonte/i.test(answer)) return "baixa";
  if (declared.startsWith("alt")) return "alta";
  if (declared.startsWith("baix")) return "baixa";
  if (declared.startsWith("med")) return "media";
  // Heuristic from retrieval score.
  if (hasRerank) return topScore >= 0.6 ? "alta" : topScore >= 0.3 ? "media" : "baixa";
  return topScore > 0 ? "media" : "baixa";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "Método não permitido." });

  let body: { query?: string; filters?: Record<string, string>; role?: string };
  try { body = await req.json(); } catch { return json(400, { error: "Corpo inválido." }); }
  const query = (body.query ?? "").trim();
  if (!query) return json(400, { error: "Pergunta vazia." });
  if (body.role && BLOCKED_ROLES.has(body.role)) return json(403, { error: "Acesso negado para este papel." });

  try {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
    const queryEmbedding = await embed(query);

    const { data: rows, error } = await sb.rpc("match_hybrid", {
      query_embedding: queryEmbedding,
      query_text: query,
      match_count: 30,
      filter: body.filters ?? {},
    });
    if (error) throw new Error(`match_hybrid: ${error.message}`);

    const candidates = (rows ?? []) as Array<{ id: string; content: string; content_md: string; metadata: Record<string, unknown>; rrf_score: number }>;
    if (candidates.length === 0) {
      return json(200, {
        answer: "Não encontrei isso nos documentos disponíveis.",
        citations: [], confidence: "baixa", retrieved: [],
      });
    }

    // Rerank (Cohere) → top K; else keep RRF order.
    const reranked = await rerank(query, candidates.map((c) => c.content));
    let top: { c: typeof candidates[number]; score: number }[];
    if (reranked) {
      top = reranked.slice(0, TOP_K).map((r) => ({ c: candidates[r.index], score: r.score }));
    } else {
      top = candidates.slice(0, TOP_K).map((c) => ({ c, score: c.rrf_score }));
    }

    const context = top.map(({ c }, i) => {
      const m = c.metadata as { doc_title?: string; section?: string; page?: number; content_type?: string };
      const head = `[${i + 1}] ${m.doc_title ?? "Documento"} — ${m.section ?? ""} (p.${m.page ?? "?"})${m.content_type === "table" ? " [TABELA]" : ""}`;
      return `${head}\n${c.content_md || c.content}`;
    }).join("\n\n---\n\n");

    const answer = await generate(query, context);
    const refused = /não encontrei|nao encontrei|não consta|sem fonte/i.test(answer);

    const citations = refused ? [] : top.map(({ c }) => {
      const m = c.metadata as { doc_title?: string; section?: string; page?: number };
      return { doc_title: m.doc_title ?? "Documento", section: m.section ?? "", page: m.page ?? null, snippet: (c.content || "").slice(0, 320) };
    });

    return json(200, {
      answer,
      citations,
      confidence: confidenceFrom(answer, top[0]?.score ?? 0, !!reranked),
      retrieved: top.map(({ c, score }) => ({ id: c.id, score, metadata: c.metadata })),
    });
  } catch (e) {
    return json(500, { error: `Falha no RAG: ${e instanceof Error ? e.message : String(e)}` });
  }
});
