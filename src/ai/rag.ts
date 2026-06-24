// ── RAG client ────────────────────────────────────────────────────────────────
// Talks to the Supabase Edge Function `assistant-rag` (hybrid retrieval + rerank +
// grounded generation). The anon key is safe in the client; the service role,
// OpenAI and Cohere keys live only in the function's secrets.

export interface RagCitation {
  doc_title: string;
  section: string;
  page: number | null;
  snippet: string;
}

export interface RagResult {
  answer: string;
  citations: RagCitation[];
  confidence: "alta" | "media" | "baixa";
  retrieved: { id: string; score: number; metadata: Record<string, unknown> }[];
}

// Supabase path (production) when configured; otherwise the repo-native local
// endpoint /api/rag (the Vite proxy over the static knowledge base) is used.
export const ragConfigured = (): boolean =>
  !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

export async function queryRag(
  query: string,
  opts?: { filters?: Record<string, string>; role?: string | null; signal?: AbortSignal },
): Promise<RagResult> {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

  const resp = (url && anon)
    ? await fetch(`${url}/functions/v1/assistant-rag`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${anon}`, apikey: anon },
        body: JSON.stringify({ query, filters: opts?.filters, role: opts?.role ?? undefined }),
        signal: opts?.signal,
      })
    : await fetch("/api/rag", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query, filters: opts?.filters, role: opts?.role ?? undefined }),
        signal: opts?.signal,
      });

  if (!resp.ok) {
    let msg = `Erro ${resp.status} ao consultar a base técnica.`;
    try { msg = (await resp.json())?.error || msg; } catch { /* keep */ }
    throw new Error(msg);
  }
  return (await resp.json()) as RagResult;
}
