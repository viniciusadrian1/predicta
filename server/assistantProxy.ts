// ── /api/assistant proxy (Vite dev middleware) ────────────────────────────────
// Server-side relay to the OpenAI Chat Completions API. The OPENAI_API_KEY is read
// from the server environment and NEVER reaches the browser. The client posts the
// system prompt + conversation + tool definitions; we stream the SSE response back.
//
// For production (vite build → static host), reimplement this as a serverless
// function (e.g. Vercel `api/assistant.ts`) with the same request/response shape.

import type { Plugin } from "vite";
import type { IncomingMessage, ServerResponse } from "node:http";
import { ragAnswer } from "./ragLocal";

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

export function assistantProxy(env: Record<string, string>): Plugin {
  return {
    name: "predicta-assistant-proxy",
    configureServer(server) {
      server.middlewares.use("/api/assistant", async (req: IncomingMessage, res: ServerResponse) => {
        const json = (status: number, obj: unknown) => {
          res.statusCode = status;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify(obj));
        };

        if (req.method !== "POST") { json(405, { error: "Método não permitido." }); return; }

        const key = env.OPENAI_API_KEY;
        if (!key) {
          json(400, { error: "OPENAI_API_KEY ausente. Copie .env.example para .env e configure a chave da OpenAI." });
          return;
        }

        let payload: { system?: string; messages?: unknown[]; tools?: unknown; max_tokens?: number };
        try { payload = JSON.parse(await readBody(req)); }
        catch { json(400, { error: "Corpo da requisição inválido." }); return; }

        // OpenAI takes the system prompt as the first message in `messages`.
        const messages = payload.system
          ? [{ role: "system", content: payload.system }, ...(payload.messages ?? [])]
          : (payload.messages ?? []);

        const model = env.OPENAI_MODEL || "gpt-4o";
        let upstream: Response;
        try {
          upstream = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "content-type": "application/json",
              authorization: `Bearer ${key}`,
            },
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
          json(upstream.status, { error: msg || `Erro ${upstream.status} da API da OpenAI.` });
          return;
        }

        res.statusCode = 200;
        res.setHeader("content-type", "text/event-stream");
        res.setHeader("cache-control", "no-cache");
        res.setHeader("connection", "keep-alive");

        const reader = upstream.body.getReader();
        const dec = new TextDecoder();
        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(dec.decode(value, { stream: true }));
          }
        } catch { /* client disconnected */ }
        res.end();
      });

      // ── /api/vision-ocr — read an asset nameplate image with a vision model ──
      // Accepts { image: dataURL } and returns structured nameplate fields as JSON.
      // Uses a vision-capable model (default gpt-4o) so it works on real photos
      // (metal, glare, angle, any layout) far better than client-side OCR.
      server.middlewares.use("/api/vision-ocr", async (req: IncomingMessage, res: ServerResponse) => {
        const json = (status: number, obj: unknown) => {
          res.statusCode = status;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify(obj));
        };
        if (req.method !== "POST") { json(405, { error: "Método não permitido." }); return; }

        const key = env.OPENAI_API_KEY;
        if (!key) { json(400, { error: "OPENAI_API_KEY ausente." }); return; }

        let payload: { image?: string };
        try { payload = JSON.parse(await readBody(req)); }
        catch { json(400, { error: "Corpo da requisição inválido." }); return; }
        if (!payload.image) { json(400, { error: "Imagem ausente." }); return; }

        const model = env.OPENAI_VISION_MODEL || "gpt-4o";
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
          json(upstream.status, { error: msg || `Erro ${upstream.status} da API da OpenAI.` });
          return;
        }
        let content = "";
        try { content = JSON.parse(text)?.choices?.[0]?.message?.content ?? ""; } catch { /* keep */ }
        let fields: unknown = {};
        try { fields = JSON.parse(content); } catch { json(502, { error: "Resposta de visão inválida." }); return; }
        json(200, fields);
      });

      // ── /api/rag — local RAG over the static knowledge base (repo-native) ──
      // Used by the assistant "Base técnica" toggle when Supabase isn't configured.
      // Cite-or-refuse + confidence; the OpenAI key stays server-side.
      server.middlewares.use("/api/rag", async (req: IncomingMessage, res: ServerResponse) => {
        const json = (status: number, obj: unknown) => {
          res.statusCode = status;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify(obj));
        };
        if (req.method !== "POST") { json(405, { error: "Método não permitido." }); return; }
        if (!env.OPENAI_API_KEY) { json(400, { error: "OPENAI_API_KEY ausente." }); return; }

        let payload: { query?: string };
        try { payload = JSON.parse(await readBody(req)); }
        catch { json(400, { error: "Corpo inválido." }); return; }
        const query = String(payload.query ?? "").trim();
        if (!query) { json(400, { error: "Pergunta vazia." }); return; }

        try { json(200, await ragAnswer(env, query)); }
        catch (e) { json(500, { error: `Falha no RAG: ${e instanceof Error ? e.message : String(e)}` }); }
      });
    },
  };
}
