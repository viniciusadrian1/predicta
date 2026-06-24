// ── Local RAG (repo-native fallback) ──────────────────────────────────────────
// Serves the static knowledge base (ingestion/build_local.py → server/rag/knowledge.json)
// when Supabase isn't configured. Hybrid retrieval (cosine + keyword, fused by RRF)
// + grounded generation with the same cite-or-refuse + confidence rules as the
// Supabase Edge Function. Runs server-side in the Vite middleware (key stays server-side).

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

interface RawChunk { id: string; content: string; content_md?: string; metadata: Record<string, unknown>; emb: string }
interface Knowledge { model: string; dimensions: number; count: number; chunks: RawChunk[] }
interface Chunk { id: string; content: string; contentMd?: string; metadata: Record<string, unknown>; vec: Float32Array; norm: number; lc: string }

const KNOWLEDGE_PATH = path.resolve(process.cwd(), "server/rag/knowledge.json");

let CACHE: { dims: number; model: string; chunks: Chunk[] } | null = null;
let LOAD_TRIED = false;

const deaccent = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const tokenize = (s: string) => (deaccent(s).match(/[a-z0-9]+/g) ?? []).filter((t) => t.length >= 2);

function decodeF32(b64: string): Float32Array {
  const buf = Buffer.from(b64, "base64");
  return new Float32Array(buf.buffer, buf.byteOffset, Math.floor(buf.byteLength / 4));
}

export function ragAvailable(): boolean {
  return existsSync(KNOWLEDGE_PATH);
}

function load(): { dims: number; model: string; chunks: Chunk[] } | null {
  if (CACHE) return CACHE;
  if (LOAD_TRIED) return null;
  LOAD_TRIED = true;
  if (!existsSync(KNOWLEDGE_PATH)) return null;
  const raw = JSON.parse(readFileSync(KNOWLEDGE_PATH, "utf-8")) as Knowledge;
  const chunks: Chunk[] = raw.chunks.map((c) => {
    const vec = decodeF32(c.emb);
    let n = 0; for (let i = 0; i < vec.length; i++) n += vec[i] * vec[i];
    return { id: c.id, content: c.content, contentMd: c.content_md, metadata: c.metadata, vec, norm: Math.sqrt(n) || 1, lc: deaccent(c.content) };
  });
  CACHE = { dims: raw.dimensions, model: raw.model, chunks };
  return CACHE;
}

async function embedQuery(env: Record<string, string>, query: string, model: string, dims: number): Promise<Float32Array> {
  const r = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${env.OPENAI_API_KEY}` },
    body: JSON.stringify({ model, input: query.replace(/\n/g, " "), dimensions: dims }),
  });
  if (!r.ok) throw new Error(`embeddings ${r.status}: ${await r.text()}`);
  return Float32Array.from((await r.json()).data[0].embedding as number[]);
}

const SYSTEM = `Você é o assistente técnico do Predicta (by Forzy), especialista em manutenção de ativos industriais.
Responda EXCLUSIVAMENTE com base nos TRECHOS fornecidos abaixo.
Regras inegociáveis:
- Cite a fonte (documento + seção/página) em cada afirmação técnica, no formato [n] referenciando os TRECHOS.
- Use os VALORES e UNIDADES exatos das tabelas; NUNCA aproxime ou arredonde (torques, intervalos, tensões, fatores).
- Se a resposta não estiver nos trechos, diga claramente "Não encontrei isso nos documentos disponíveis." e NÃO invente. Isto é uma exigência de SEGURANÇA: valores errados de lubrificação, torque ou tensão de ensaio podem causar dano a pessoas e equipamentos.
- Tom técnico, conciso, em português do Brasil.
Termine SEMPRE com uma linha no formato "Confiança: alta" | "Confiança: média" | "Confiança: baixa", coerente com a cobertura dos trechos.`;

async function generate(env: Record<string, string>, query: string, context: string): Promise<string> {
  const model = env.GEN_MODEL || env.OPENAI_MODEL || "gpt-4o";
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model, temperature: 0, max_tokens: 900,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: `TRECHOS:\n${context}\n\nPERGUNTA: ${query}` },
      ],
    }),
  });
  if (!r.ok) throw new Error(`chat ${r.status}: ${await r.text()}`);
  return (await r.json()).choices?.[0]?.message?.content ?? "";
}

export async function ragAnswer(env: Record<string, string>, query: string) {
  const kb = load();
  if (!kb) throw new Error("Base local não encontrada (rode ingestion/build_local.py).");
  if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY ausente.");

  // ── Dense (cosine) ranking ──
  const q = await embedQuery(env, query, kb.model, kb.dims);
  let qn = 0; for (let i = 0; i < q.length; i++) qn += q[i] * q[i];
  qn = Math.sqrt(qn) || 1;
  const dense = kb.chunks.map((c, idx) => {
    const n = Math.min(c.vec.length, q.length);
    let dot = 0; for (let i = 0; i < n; i++) dot += c.vec[i] * q[i];
    return { idx, score: dot / (c.norm * qn) };
  }).sort((a, b) => b.score - a.score);

  // ── Sparse (keyword overlap) ranking ──
  const toks = [...new Set(tokenize(query))];
  const sparse = kb.chunks.map((c, idx) => {
    let hit = 0; for (const t of toks) if (c.lc.includes(t)) hit++;
    return { idx, score: hit };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score);

  // ── RRF fusion ──
  const K = 50, POOL = 40;
  const rrf = new Map<number, number>();
  dense.slice(0, POOL).forEach((d, r) => rrf.set(d.idx, (rrf.get(d.idx) ?? 0) + 1 / (K + r + 1)));
  sparse.slice(0, POOL).forEach((s, r) => rrf.set(s.idx, (rrf.get(s.idx) ?? 0) + 1 / (K + r + 1)));
  const topK = Number(env.TOP_K || "7");
  const fused = [...rrf.entries()].sort((a, b) => b[1] - a[1]).slice(0, topK);

  if (fused.length === 0) {
    return { answer: "Não encontrei isso nos documentos disponíveis.", citations: [], confidence: "baixa", retrieved: [] };
  }

  const top = fused.map(([idx, score]) => ({ c: kb.chunks[idx], score }));
  const context = top.map(({ c }, i) => {
    const m = c.metadata as { doc_title?: string; section?: string; page?: number; content_type?: string };
    const head = `[${i + 1}] ${m.doc_title ?? "Documento"} — ${m.section ?? ""} (p.${m.page ?? "?"})${m.content_type === "table" ? " [TABELA]" : ""}`;
    return `${head}\n${c.contentMd || c.content}`;
  }).join("\n\n---\n\n");

  const answer = await generate(env, query, context);
  const refused = /não encontrei|nao encontrei|não consta|sem fonte/i.test(answer);

  // Confidence from top dense cosine (and any explicit declaration / refusal).
  const topCos = dense[0]?.score ?? 0;
  const declared = (answer.match(/Confian[çc]a:\s*(alta|m[ée]dia|baixa)/i)?.[1] || "").toLowerCase();
  let confidence: "alta" | "media" | "baixa";
  if (refused) confidence = "baixa";
  else if (declared.startsWith("alt")) confidence = "alta";
  else if (declared.startsWith("baix")) confidence = "baixa";
  else if (declared.startsWith("m")) confidence = "media";
  else confidence = topCos >= 0.45 ? "alta" : topCos >= 0.32 ? "media" : "baixa";

  const citations = refused ? [] : top.map(({ c }) => {
    const m = c.metadata as { doc_title?: string; section?: string; page?: number };
    return { doc_title: m.doc_title ?? "Documento", section: m.section ?? "", page: m.page ?? null, snippet: (c.content || "").slice(0, 320) };
  });

  return {
    answer, citations, confidence,
    retrieved: top.map(({ c, score }) => ({ id: c.id, score, metadata: c.metadata })),
  };
}
