// ── /api/rag — Vercel Serverless Function (production) ─────────────────────────
// Local RAG over the static knowledge base (server/rag/knowledge.json). Hybrid
// retrieval (cosine + keyword fused by RRF) + grounded generation with cite-or-refuse
// + confidence. OPENAI_API_KEY stays server-side. Mirrors server/ragLocal.ts.
//
// The knowledge.json file is bundled into this function via the "includeFiles"
// setting in vercel.json. The parsed KB is cached in module scope across warm calls.

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

export const config = { maxDuration: 60 };

interface RawChunk { id: string; content: string; content_md?: string; metadata: Record<string, unknown>; emb: string }
interface Knowledge { model: string; dimensions: number; count: number; chunks: RawChunk[] }
interface Chunk { id: string; content: string; contentMd?: string; metadata: Record<string, unknown>; vec: Float32Array; norm: number; lc: string }

// Candidate locations the bundled file may resolve to on Vercel / locally.
const CANDIDATES = [
  path.join(process.cwd(), "server/rag/knowledge.json"),
  path.join(process.cwd(), "server", "rag", "knowledge.json"),
];

let CACHE: { dims: number; model: string; chunks: Chunk[] } | null = null;
let LOAD_TRIED = false;

const deaccent = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const tokenize = (s: string) => (deaccent(s).match(/[a-z0-9]+/g) ?? []).filter((t) => t.length >= 2);

function decodeF32(b64: string): Float32Array {
  const buf = Buffer.from(b64, "base64");
  return new Float32Array(buf.buffer, buf.byteOffset, Math.floor(buf.byteLength / 4));
}

function knowledgePath(): string | null {
  for (const p of CANDIDATES) if (existsSync(p)) return p;
  return null;
}

function load(): { dims: number; model: string; chunks: Chunk[] } | null {
  if (CACHE) return CACHE;
  if (LOAD_TRIED) return null;
  LOAD_TRIED = true;
  const p = knowledgePath();
  if (!p) return null;
  const raw = JSON.parse(readFileSync(p, "utf-8")) as Knowledge;
  const chunks: Chunk[] = raw.chunks.map((c) => {
    const vec = decodeF32(c.emb);
    let n = 0; for (let i = 0; i < vec.length; i++) n += vec[i] * vec[i];
    return { id: c.id, content: c.content, contentMd: c.content_md, metadata: c.metadata, vec, norm: Math.sqrt(n) || 1, lc: deaccent(c.content) };
  });
  CACHE = { dims: raw.dimensions, model: raw.model, chunks };
  return CACHE;
}

async function embedQuery(query: string, model: string, dims: number): Promise<Float32Array> {
  const r = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
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

async function generate(query: string, context: string): Promise<string> {
  const model = process.env.GEN_MODEL || process.env.OPENAI_MODEL || "gpt-4o";
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
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

async function ragAnswer(query: string) {
  const kb = load();
  if (!kb) throw new Error("Base técnica não encontrada no deploy (server/rag/knowledge.json).");

  const q = await embedQuery(query, kb.model, kb.dims);
  let qn = 0; for (let i = 0; i < q.length; i++) qn += q[i] * q[i];
  qn = Math.sqrt(qn) || 1;
  const dense = kb.chunks.map((c, idx) => {
    const n = Math.min(c.vec.length, q.length);
    let dot = 0; for (let i = 0; i < n; i++) dot += c.vec[i] * q[i];
    return { idx, score: dot / (c.norm * qn) };
  }).sort((a, b) => b.score - a.score);

  const toks = [...new Set(tokenize(query))];
  const sparse = kb.chunks.map((c, idx) => {
    let hit = 0; for (const t of toks) if (c.lc.includes(t)) hit++;
    return { idx, score: hit };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score);

  const K = 50, POOL = 40;
  const rrf = new Map<number, number>();
  dense.slice(0, POOL).forEach((d, r) => rrf.set(d.idx, (rrf.get(d.idx) ?? 0) + 1 / (K + r + 1)));
  sparse.slice(0, POOL).forEach((s, r) => rrf.set(s.idx, (rrf.get(s.idx) ?? 0) + 1 / (K + r + 1)));
  const topK = Number(process.env.TOP_K || "7");
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

  const answer = await generate(query, context);
  const refused = /não encontrei|nao encontrei|não consta|sem fonte/i.test(answer);

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

  return { answer, citations, confidence, retrieved: top.map(({ c, score }) => ({ id: c.id, score, metadata: c.metadata })) };
}

async function readJson(req: any): Promise<any> {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") { try { return JSON.parse(req.body); } catch { return {}; } }
  return await new Promise((resolve) => {
    let data = "";
    req.on("data", (c: any) => (data += c));
    req.on("end", () => { try { resolve(JSON.parse(data || "{}")); } catch { resolve({}); } });
    req.on("error", () => resolve({}));
  });
}

export default async function handler(req: any, res: any) {
  const json = (status: number, obj: unknown) => {
    res.statusCode = status;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify(obj));
  };

  if (req.method !== "POST") { json(405, { error: "Método não permitido." }); return; }
  if (!process.env.OPENAI_API_KEY) { json(400, { error: "OPENAI_API_KEY ausente. Configure-a no projeto Vercel (sem o prefixo VITE_)." }); return; }

  const payload = await readJson(req) as { query?: string };
  const query = String(payload.query ?? "").trim();
  if (!query) { json(400, { error: "Pergunta vazia." }); return; }

  try { json(200, await ragAnswer(query)); }
  catch (e) { json(500, { error: `Falha no RAG: ${e instanceof Error ? e.message : String(e)}` }); }
}
