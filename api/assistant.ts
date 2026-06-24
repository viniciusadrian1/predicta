// ── /api/assistant — Vercel Serverless Function (production) ───────────────────
// Server-side relay to the OpenAI Chat Completions API. OPENAI_API_KEY is read from
// the Vercel environment and NEVER reaches the browser. Streams the SSE response
// back to the client. Mirrors the Vite dev middleware in server/assistantProxy.ts.

export const config = { maxDuration: 60 };

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

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    json(400, { error: "OPENAI_API_KEY ausente. Configure a variável de ambiente OPENAI_API_KEY no projeto Vercel (sem o prefixo VITE_)." });
    return;
  }

  const payload = await readJson(req) as { system?: string; messages?: unknown[]; tools?: unknown; max_tokens?: number };

  // OpenAI takes the system prompt as the first message in `messages`.
  const messages = payload.system
    ? [{ role: "system", content: payload.system }, ...(payload.messages ?? [])]
    : (payload.messages ?? []);

  const model = process.env.OPENAI_MODEL || "gpt-4o";
  let upstream: Response;
  try {
    upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages,
        tools: payload.tools,
        max_tokens: payload.max_tokens ?? 2048,
        stream: true,
      }),
    });
  } catch {
    json(502, { error: "Falha de rede ao contatar a API da OpenAI." });
    return;
  }

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "");
    let msg = text;
    try { msg = JSON.parse(text)?.error?.message || text; } catch { /* keep raw */ }
    json(upstream.status || 502, { error: msg || `Erro ${upstream.status} da API da OpenAI.` });
    return;
  }

  res.statusCode = 200;
  res.setHeader("content-type", "text/event-stream");
  res.setHeader("cache-control", "no-cache, no-transform");
  res.setHeader("connection", "keep-alive");

  const reader = (upstream.body as any).getReader();
  const dec = new TextDecoder();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(dec.decode(value, { stream: true }));
      if (typeof res.flush === "function") res.flush();
    }
  } catch { /* client disconnected */ }
  res.end();
}
