// ── /api/vision-ocr — Vercel Serverless Function (production) ──────────────────
// Reads an asset nameplate image with a vision model. Accepts { image: dataURL }
// and returns structured nameplate fields as JSON. OPENAI_API_KEY stays server-side.
// Mirrors the Vite dev middleware in server/assistantProxy.ts.

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
  if (!key) { json(400, { error: "OPENAI_API_KEY ausente. Configure-a no projeto Vercel (sem o prefixo VITE_)." }); return; }

  const payload = await readJson(req) as { image?: string };
  if (!payload.image) { json(400, { error: "Imagem ausente." }); return; }

  const model = process.env.OPENAI_VISION_MODEL || "gpt-4o";
  const instr =
    "Você extrai dados de placas de identificação (nameplates) de equipamentos industriais a partir da imagem. " +
    "Responda APENAS com um objeto JSON com as chaves: fabricante, modelo, serie, potencia (com unidade, ex.: \"7.5 kW\"), " +
    "rotacao (ex.: \"1450 rpm\"), tensao (ex.: \"220/380V / 60Hz\"), corrente (ex.: \"26 A\"), ip (ex.: \"IP55\"), tipo " +
    "(ex.: Motor, Bomba, Compressor) e confianca (número 0–100). Use null para campos ilegíveis ou ausentes. NÃO invente valores.";

  let upstream: Response;
  try {
    upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: instr },
          { role: "user", content: [
            { type: "text", text: "Extraia os dados desta placa de identificação." },
            { type: "image_url", image_url: { url: payload.image, detail: "high" } },
          ] },
        ],
        response_format: { type: "json_object" },
        max_tokens: 700,
        temperature: 0,
      }),
    });
  } catch { json(502, { error: "Falha de rede ao contatar a API da OpenAI." }); return; }

  const text = await upstream.text().catch(() => "");
  if (!upstream.ok) {
    let msg = text;
    try { msg = JSON.parse(text)?.error?.message || text; } catch { /* keep */ }
    json(upstream.status || 502, { error: msg || `Erro ${upstream.status} da API da OpenAI.` });
    return;
  }
  let content = "";
  try { content = JSON.parse(text)?.choices?.[0]?.message?.content ?? ""; } catch { /* keep */ }
  let fields: unknown = {};
  try { fields = JSON.parse(content); } catch { json(502, { error: "Resposta de visão inválida." }); return; }
  json(200, fields);
}
