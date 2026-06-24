// ── Assistant client ──────────────────────────────────────────────────────────
// Posts the conversation to the secure /api/assistant proxy and parses the streamed
// SSE response from the OpenAI Chat Completions API (content deltas + tool_calls).
// The proxy injects the API key and prepends the system prompt.

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content?: string | null;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface AssistantRequest {
  system?: string;
  messages: ChatMessage[];
  tools?: unknown[];
  max_tokens?: number;
}

export interface StreamResult {
  text: string;
  toolCalls: ToolCall[];
  finishReason: string | null; // "stop" | "tool_calls" | ...
}

export interface StreamCallbacks {
  onText?: (delta: string) => void;
  onDone?: (r: StreamResult) => void;
  onError?: (msg: string) => void;
}

const safeParse = (s: string): Record<string, unknown> => {
  try { return JSON.parse(s); } catch { return {}; }
};

export async function streamAssistant(
  body: AssistantRequest,
  cb: StreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  let resp: Response;
  try {
    resp = await fetch("/api/assistant", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch {
    cb.onError?.("Não foi possível conectar ao assistente.");
    return;
  }

  if (!resp.ok) {
    let msg = `Erro ${resp.status} ao consultar o assistente.`;
    try { msg = (await resp.json())?.error || msg; } catch { /* keep */ }
    cb.onError?.(msg);
    return;
  }
  if (!resp.body) { cb.onError?.("Resposta vazia do assistente."); return; }

  const reader = resp.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let text = "";
  let finishReason: string | null = null;
  // OpenAI streams tool calls incrementally, keyed by index.
  const toolBlocks: Record<number, { id: string; name: string; args: string }> = {};

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        const l = line.trim();
        if (!l.startsWith("data:")) continue;
        const data = l.slice(5).trim();
        if (!data || data === "[DONE]") continue;
        let evt: any;
        try { evt = JSON.parse(data); } catch { continue; }

        if (evt.error) { cb.onError?.(evt.error.message || "Erro no streaming do assistente."); return; }

        const choice = evt.choices?.[0];
        if (!choice) continue;
        const delta = choice.delta ?? {};

        if (typeof delta.content === "string" && delta.content) { text += delta.content; cb.onText?.(delta.content); }

        if (Array.isArray(delta.tool_calls)) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index ?? 0;
            if (!toolBlocks[idx]) toolBlocks[idx] = { id: "", name: "", args: "" };
            if (tc.id) toolBlocks[idx].id = tc.id;
            if (tc.function?.name) toolBlocks[idx].name = tc.function.name;
            if (tc.function?.arguments) toolBlocks[idx].args += tc.function.arguments;
          }
        }

        if (choice.finish_reason) finishReason = choice.finish_reason;
      }
    }
  } catch (e) {
    if ((e as { name?: string })?.name === "AbortError") return;
    cb.onError?.("Conexão com o assistente interrompida.");
    return;
  }

  const toolCalls: ToolCall[] = Object.values(toolBlocks)
    .filter((t) => t.name)
    .map((t) => ({ id: t.id, name: t.name, input: t.args ? safeParse(t.args) : {} }));
  cb.onDone?.({ text, toolCalls, finishReason });
}
